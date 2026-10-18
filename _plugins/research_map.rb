# frozen_string_literal: true
require 'digest'
require 'json'

# Pure build-time projection. Never writes generated data into the source tree.
module ResearchMap
  SCHEMA_REVISION = 'research-map-v1'.freeze
  ENGLISH_STOPWORDS = %w[
    a an the and or but of on in at to for from with by as is are was were be been being
    this that these those its their our it they how what which when where why does do can
    study studies research analysis analyses analyzing approach approaches effect effects
    impact impacts influence influences relationship relationships relation relations role roles
    mediating mediation mediator mediators moderated moderating moderation moderator moderators
    through between among towards toward using use based examination exploring investigating
    investigation comparative comparison empirical findings implications case results evidence
    factors factor process processes model models method methods framework perspective
  ].freeze
  GENERIC_ENGLISH_WORDS = %w[
    organizational organization organizations learning knowledge employee employees work job jobs
    team teams school schools student students teacher teachers korean korea south context contexts
    individual individuals perceived social workplace corporate business education educational
    performance development practice practices training management women managers members
    technical higher supportive toward always conceptual integrated positive negative
    career developing measurement transformational psychological mutual employees focus group small
    behavior behaviour change openness support complex content emotional influential locus quality
    systematic improvement firms version country countries
  ].freeze
  KOREAN_STOPWORDS = %w[
    연구 분석 관계 영향 효과 관한 대한 미치는 통한 활용 활용한 적용 적용한 중심 중심으로
    매개효과 조절효과 조절된 매개모형 모형 모델 요인 결과 유형 탐색 검증 비교 국내 한국
    구조적 구조적인 종단적 실증연구 체계적 비판적 통합적 의미 경험 인식 변화 차이
    연구동향 관련변인 결정요인 예측요인 영향요인 결과요인 특성 조절된매개효과
    직렬다중매개효과 다중매개효과 이중매개효과 매개하여 프로파일 포레스트 프로그램
    지원도구 연구기관 반생산적
  ].freeze

  def self.build(publications, taxonomy)
    fields = taxonomy.each_with_index.map do |field, index|
      { 'fi' => index, 'name' => field['field'], 'en' => field['en'], 'group' => field['group'] || 'Other' }
    end
    journals = publications.filter_map { |publication| publication['journal'] }.reject(&:empty?).uniq.map do |journal|
      flexible = journal.gsub(/[[:space:]]+/, '').chars.map { |c| Regexp.escape(c) }.join('[[:space:]]*')
      /[.!?,]\s+#{flexible}(?=[.,]|\s+\d|\z)/i
    end
    doi_groups = publications.reject { |row| row['citation'].to_s.strip.empty? }
                             .group_by { |row| publication_identity(row) }
    warnings = doi_groups.filter_map do |identity, rows|
      titles = rows.map { |row| title_of(row, journals) }.uniq { |title| normalize(title) }.sort
      next unless identity.start_with?('doi:') && titles.length > 1 && rows.map { |row| normalize(row['citation']) }.uniq.length > 1
      { 'code' => 'duplicate_doi_conflict', 'identity' => identity, 'titles' => titles }
    end
    grouped = group_publications(publications, journals, warnings.map { |warning| warning['identity'] })
    duplicates = grouped.values.sum { |rows| rows.length - 1 }
    metadata = {}
    papers = grouped.map do |identity, rows|
      publication = rows.find { |row| !row['title'].to_s.strip.empty? } || rows.first
      id = 'p' + Digest::SHA256.hexdigest(identity)
      metadata[id] = rows.flat_map { |row| Array(row['keywords']) }.map { |word| word.to_s.strip }.reject(&:empty?).uniq
      { 'id' => id, 'type' => 'paper', 'year' => publication['year'],
        'citation' => publication['citation'].strip, 'name' => title_of(publication, journals),
        'kws' => [], 'fi' => -1 }
    end
    aliases = []
    known_patterns = []
    keywords = taxonomy.each_with_index.flat_map do |field, fi|
      field.fetch('keywords').filter_map do |keyword|
        patterns = Array(keyword['patterns']).map do |pattern|
          begin
            Regexp.new(pattern, Regexp::IGNORECASE)
          rescue RegexpError => error
            raise RegexpError, "keyword_map field=#{field['field'].inspect} keyword=#{keyword['name'].inspect} pattern=#{pattern.inspect}: #{error.message}"
          end
        end
        known_patterns.concat(patterns)
        names = [keyword['name'], keyword['en']].compact.map { |name| normalize(name) }
        aliases.concat(names)
        matches = papers.select do |paper|
          patterns.any? { |pattern| pattern.match?(paper['name']) } ||
            metadata[paper['id']].any? { |word| names.include?(normalize(word)) }
        end
        next if matches.length < 2
        keyword_node('taxonomy:' + normalize(field['field']) + ':' + normalize(keyword['name']),
                     keyword['en'] || keyword['name'], keyword['name'], fi, matches.map { |paper| paper['id'] },
                     'taxonomy', Array(keyword['also']).dup)
      end
    end
    novel = {}
    metadata.each do |id, words|
      words.each do |word|
        key = normalize(word)
        next if aliases.include?(key)
        novel[key] ||= { 'name' => word, 'papers' => [] }
        novel[key]['papers'] << id unless novel[key]['papers'].include?(id)
      end
    end
    discover_terms(papers, known_patterns, aliases).each do |term, support|
      novel[term] ||= { 'name' => term, 'papers' => [], 'source' => 'title' }
      novel[term]['papers'] |= support
    end
    unless novel.empty?
      fi = fields.length
      fields << { 'fi' => fi, 'name' => '새로운 연구 주제', 'en' => 'Emerging Topics', 'group' => 'Emerging Topics' }
      novel.sort.each do |key, entry|
        keywords << keyword_node('emerging:' + key, entry['name'], entry['name'], fi, entry['papers'], entry['source'] || 'metadata')
      end
    end
    links = keywords.flat_map do |keyword|
      keyword['papers'].map do |paper_id|
        papers.find { |paper| paper['id'] == paper_id }['kws'] << keyword['id']
        { 'source' => keyword['id'], 'target' => paper_id }
      end
    end
    papers.each do |paper|
      counts = keywords.select { |kw| paper['kws'].include?(kw['id']) }.group_by { |kw| kw['fi'] }
      paper['fi'] = counts.keys.min_by { |fi| [-counts[fi].length, fi] } || -1
    end
    algorithm_fingerprint = Digest::SHA256.file(__FILE__).hexdigest
    {
      'version' => Digest::SHA256.hexdigest(JSON.generate(canonical([SCHEMA_REVISION, algorithm_fingerprint, publications, taxonomy]))),
      'fields' => fields, 'papers' => papers, 'keywords' => keywords, 'links' => links,
      'stats' => { 'papers' => papers.length, 'keywords' => keywords.length, 'links' => links.length,
                   'visible' => papers.length + keywords.length },
      'extraction' => {
        'schema' => SCHEMA_REVISION, 'algorithm_fingerprint' => algorithm_fingerprint,
        'method' => 'Deterministic taxonomy matching, explicit metadata, and bilingual title document frequency',
        'external_services' => false,
        'duplicate_publications' => duplicates, 'warnings' => warnings,
        'taxonomy_min_papers' => 2, 'metadata_min_papers' => 1,
        'title_phrase_min_papers' => 2, 'english_phrase_words' => [2, 3],
        'english_word_min_papers' => 3, 'english_word_min_characters' => 5,
        'korean_compound_min_papers' => 2, 'korean_min_characters' => 4,
        'max_auto_keywords' => 24,
        'ranking' => 'Unique paper support descending, phrase word count descending, normalized term ascending; identical-support subphrases suppressed',
        'normalization' => 'Unicode NFKC, case folding, whitespace collapse; citation or DOI dedupe, never title-only dedupe',
        'title_extraction' => 'Explicit title first; otherwise after citation year, excluding known or bibliographic journal suffixes',
        'unknown_field' => 'Emerging Topics (no inferred academic classification)',
        'keyword_sources' => %w[taxonomy metadata title].to_h { |source| [source, keywords.count { |kw| kw['source'] == source }] },
        'stopwords' => { 'english' => ENGLISH_STOPWORDS.dup, 'english_single_or_generic_phrase' => GENERIC_ENGLISH_WORDS.dup,
                         'korean' => KOREAN_STOPWORDS.dup }
      }
    }
  end

  def self.discover_terms(papers, patterns, aliases)
    support = Hash.new { |hash, key| hash[key] = [] }
    masks = patterns.map { |pattern| Regexp.new("[[:alnum:]_-]*(?:#{pattern.source})[[:alnum:]_-]*", Regexp::IGNORECASE) }
    papers.each do |paper|
      text = normalize(paper['name'])
      # Mask complete tokens around taxonomy matches, including stem patterns.
      masks.each { |pattern| text = text.gsub(pattern, ' | ') }
      # Punctuation and stopwords break phrases; never bridge unrelated clauses.
      chunks = text.gsub(/[^a-z'\-\s]/, ' | ').split.map do |word|
        word = word.sub(/['’]s?\z/, '')
        ENGLISH_STOPWORDS.include?(word) || word.length < 3 ? '|' : word
      end.join(' ').split('|')
      terms = chunks.flat_map do |chunk|
        words = chunk.split.reject { |word| word.length < 3 }
        phrases = [2, 3].flat_map { |size| words.each_cons(size).map { |phrase| phrase.join(' ') } }
        singles = words.select { |word| word.length >= 5 && !GENERIC_ENGLISH_WORDS.include?(word) }
        phrases.reject { |phrase| phrase.split.all? { |word| GENERIC_ENGLISH_WORDS.include?(word) } } + singles
      end
      korean = text.scan(/[가-힣]+/).map do |word|
        next if KOREAN_STOPWORDS.include?(word)
        stem = word.sub(/(?:으로부터|에서의|으로의|에게서|에서는|에서|으로|에게|과의|와의|들의|의|이|가|을|를|은|는|과|와|도|에)\z/, '')
        stem.length >= 4 && !KOREAN_STOPWORDS.include?(stem) ? stem : nil
      end.compact
      (terms + korean).uniq.each { |term| support[term] << paper['id'] }
    end
    eligible = support.select do |term, ids|
      minimum = term.match?(/\A[a-z'-]+\z/) ? 3 : 2
      ids.length >= minimum && !aliases.include?(term) && !patterns.any? { |pattern| pattern.match?(term) }
    end
    eligible.reject do |term, ids|
      eligible.any? do |other, other_ids|
        other != term && other_ids == ids && (" #{other} ").include?(" #{term} ")
      end
    end.sort_by { |term, ids| [-ids.length, -term.split.length, term] }.first(24)
  end

  def self.keyword_node(identity, name, ko, fi, papers, source, also = [])
    { 'id' => 'k' + Digest::SHA256.hexdigest(identity), 'type' => 'kw', 'name' => name, 'ko' => ko,
      'fi' => fi, 'also' => also, 'papers' => papers, 'source' => source }
  end

  def self.canonical(value)
    case value
    when Hash then value.keys.sort.to_h { |key| [key, canonical(value[key])] }
    when Array then value.map { |entry| canonical(entry) }
    else value
    end
  end

  def self.normalize(value)
    value.to_s.unicode_normalize(:nfkc).downcase.gsub(/[[:space:]]+/, ' ').strip
  end

  # Union normalized citations and compatible DOI rows, including transitive duplicates.
  # A conflicting DOI must not erase a distinct paper; preserve each title and warn.
  # Titles alone are intentionally never identity keys.
  def self.group_publications(publications, journals, conflicting_dois)
    rows = publications.reject { |row| row['citation'].to_s.strip.empty? }
    parents = {}
    root = lambda do |key|
      parent = parents.fetch(key, key)
      parents[key] = parent == key ? key : root.call(parent)
    end
    rows.each do |row|
      citation = 'citation:' + normalize(row['citation'])
      identity = publication_identity(row)
      identity += ':title:' + Digest::SHA256.hexdigest(normalize(title_of(row, journals))) if conflicting_dois.include?(identity)
      left, right = root.call(citation), root.call(identity)
      preferred = [left, right].min_by { |key| [key.start_with?('doi:') ? 0 : 1, key] }
      parents[left] = preferred
      parents[right] = preferred
    end
    rows.group_by { |row| root.call('citation:' + normalize(row['citation'])) }
  end

  def self.publication_identity(publication)
    doi = "#{publication['doi']} #{publication['citation']}".match(/10\.\d{4,9}\/[^\s<>]+/i)
    if doi
      value = normalize(doi[0]).sub(/[.,;:]+\z/, '')
      # Remove citation wrappers, not balanced parentheses belonging to the DOI.
      value = value[0...-1].sub(/[.,;:]+\z/, '') while value.end_with?(')') && value.count(')') > value.count('(')
      return 'doi:' + value
    end

    'citation:' + normalize(publication['citation'])
  end

  def self.title_of(publication, journals)
    explicit = publication['title'].to_s.strip
    return explicit unless explicit.empty?

    title = publication['citation'].to_s.sub(/\A.*?\(\d{4}[a-z]?\)\.?\s*/, '')
    # Locate a bibliographic suffix, not the first period (U.S., e.g., etc.).
    suffix = /[.!?,]\s+([^.!?,]+?)(?=[.,]\s*\d|\s+\d+\()/
    journal_words = /journal|quarterly|research|review|education|development|management|learning|leadership|연구|학회|논문지|교육비평/i
    boundaries = []
    title.to_enum(:scan, suffix).each do
      match = Regexp.last_match
      boundaries << match.begin(0) if journal_words.match?(match[1])
    end
    journals.each do |journal|
      match = journal.match(title)
      boundaries << match.begin(0) if match
    end
    unless boundaries.empty?
      boundary = boundaries.min
      boundary += 1 if ['?', '!'].include?(title[boundary])
      title = title[0...boundary]
    end
    title.sub(/\s*\(?(?:https?:\/\/|(?:dx\.)?doi\.org\/|doi:)\S*.*/i, '').strip.sub(/[.,]\z/, '')
  end

  # Jekyll loads plugins before running generators; pure tests need no Jekyll gem.
  if defined?(Jekyll::Generator)
    class Generator < Jekyll::Generator
      safe true
      priority :low

      def generate(site)
        site.data['research_map'] = ResearchMap.build(site.data.fetch('publications', []), site.data.fetch('keyword_map', []))
      end
    end
  end
end
