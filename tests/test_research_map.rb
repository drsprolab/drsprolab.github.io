# frozen_string_literal: true
require 'minitest/autorun'
require 'json'
require 'yaml'
plugin = File.expand_path('../_plugins/research_map.rb', __dir__)
require plugin if File.exist?(plugin)

class ResearchMapTest < Minitest::Test
  def taxonomy
    [{ 'field' => '조직행동', 'en' => 'Behavior', 'group' => 'Org. Development',
       'keywords' => [{ 'name' => '리더십', 'en' => 'Leadership', 'patterns' => ['리더십', 'leadership'], 'also' => ['Engagement'] }] }]
  end

  def paper(title, author = 'Kim', **extra)
    { 'year' => 2026, 'citation' => "#{author}, A. (2026). #{title}. Journal of Testing, 1(2), 1-9.",
      'journal' => 'Journal of Testing' }.merge(extra.transform_keys(&:to_s))
  end

  def test_add_edit_remove_rebuilds_graph_and_threshold
    one = paper('Ethical leadership and teams')
    two = paper('Leadership in schools', 'Park')
    single = ResearchMap.build([one], taxonomy)
    assert_equal 1, single['papers'].length
    assert_empty single['keywords']
    added = ResearchMap.build([one, two], taxonomy)
    assert_equal({ 'papers' => 2, 'keywords' => 1, 'links' => 2, 'visible' => 3 }, added['stats'])
    kw = added['keywords'].first
    assert_equal 'taxonomy', kw['source']
    assert_equal ['Engagement'], kw['also']
    assert_equal added['papers'].map { |p| p['id'] }.sort, kw['papers'].sort
    added['papers'].each do |p|
      assert_equal [kw['id']], p['kws']
      assert_equal 0, p['fi']
      assert_match(/\Ap[0-9a-f]+\z/, p['id'])
      assert_equal 'paper', p['type']
    end
    assert_match(/\Ak[0-9a-f]+\z/, kw['id'])
    edited = ResearchMap.build([one, paper('Novel workplace perspective', 'Park')], taxonomy)
    assert_equal 2, edited['papers'].length
    assert_empty edited['keywords']
    assert_empty edited['links']
    assert_equal [-1, -1], edited['papers'].map { |p| p['fi'] }
    assert_equal single, ResearchMap.build([one], taxonomy)
    refute_equal added['version'], edited['version']
  end

  def test_titles_exclude_authors_and_journals_without_truncating_abbreviations
    pubs = [
      paper('U.S. workplaces and teams'),
      paper('Leadership in journals only', 'Park', title: 'Explicit title wins.'),
      { 'year' => 2026, 'citation' => 'Leadership, J. (2026). Quiet teams. Journal of Leadership, 2, 3-8.' },
      { 'year' => 2025, 'citation' => '리더십, 김 (2025) 조용한 일터에 관한 탐구, 리더십연구, 2(1), 1-9.' },
      paper('Calm teams', 'Song', journal: 'Journal of Leadership', citation: 'Song (2026). Calm teams. Journal of Leadership, 3, 1-2.')
    ]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal ['U.S. workplaces and teams', 'Explicit title wins.', 'Quiet teams', '조용한 일터에 관한 탐구', 'Calm teams'], map['papers'].map { |p| p['name'] }
    assert_empty map['keywords']
    assert_equal [], ResearchMap.build([{}, { 'citation' => '  ' }], taxonomy)['papers']
  end

  def test_deduplicates_citation_and_doi_but_not_titles
    original = paper('Calm teams')
    case_space = original.merge('citation' => original['citation'].upcase.gsub(' ', '  '))
    doi_one = paper('Leadership in business', 'Oh', doi: 'https://doi.org/10.1000/ABC.')
    doi_two = paper('Leadership in business', 'Seo', citation: 'Seo (2026). Leadership in business. https://dx.doi.org/10.1000/abc')
    same_title = paper('Calm teams', 'Lee')
    map = ResearchMap.build([original, case_space, doi_one, doi_two, same_title], taxonomy)
    assert_equal 3, map['stats']['papers']
    assert_equal 2, map['papers'].count { |p| p['name'] == 'Calm teams' }
    assert_equal ResearchMap.build([original], taxonomy)['papers'].first['id'], ResearchMap.build([case_space], taxonomy)['papers'].first['id']
    assert_equal ResearchMap.build([doi_one], taxonomy)['papers'].first['id'], ResearchMap.build([doi_two], taxonomy)['papers'].first['id']
    assert_equal 2, map['extraction']['duplicate_publications']
  end

  def test_wrapped_doi_deduplicates_with_plain_doi
    plain = paper('Calm teams', doi: '10.1000/abc')
    wrapped = paper('Calm teams', 'Park',
                    citation: 'Park (2026). Calm teams. (https://doi.org/10.1000/abc).')
    assert_equal 'doi:10.1000/abc', ResearchMap.publication_identity(wrapped)
    map = ResearchMap.build([plain, wrapped], taxonomy)
    assert_equal 1, map['stats']['papers']
    assert_equal 1, map['extraction']['duplicate_publications']
    assert_equal 'Calm teams', ResearchMap.title_of(wrapped, [])
    assert_empty map['extraction']['warnings']
    assert_equal ResearchMap.build([plain], taxonomy)['papers'].first['id'], map['papers'].first['id']
  end

  def test_wrapped_doi_preserves_balanced_internal_parentheses
    plain = paper('Calm teams', doi: '10.1000/abc(def)')
    wrapped = paper('Calm teams', 'Park',
                    citation: 'Park (2026). Calm teams. (https://doi.org/10.1000/abc(def)).')
    distinct = paper('Calm teams', 'Song', doi: '10.1000/abcdef')
    assert_equal 'doi:10.1000/abc(def)', ResearchMap.publication_identity(wrapped)
    assert_equal ResearchMap.publication_identity(plain), ResearchMap.publication_identity(wrapped)
    refute_equal ResearchMap.publication_identity(distinct), ResearchMap.publication_identity(wrapped)
    map = ResearchMap.build([plain, wrapped, distinct], taxonomy)
    assert_equal 2, map['stats']['papers']
    assert_equal 1, map['extraction']['duplicate_publications']
    assert_equal 'Calm teams', ResearchMap.title_of(wrapped, [])
    assert_empty map['extraction']['warnings']
  end

  def test_wrapped_doi_title_preserves_punctuation_and_abbreviations
    ['U.S. teams (e.g., schools): Calm, not quiet?', 'Calm teams (revisited)!'].each do |title|
      wrapped = paper(title, citation: "Park (2026). #{title} (https://doi.org/10.1000/abc(def)).")
      assert_equal title, ResearchMap.title_of(wrapped, [])
    end
  end

  def test_metadata_maps_known_names_and_introduces_unknown_singletons
    first = paper('A calm workplace', keywords: ['  LEADERSHIP ', 'Quantum Mentoring', 'quantum mentoring'])
    second = paper('Different schools', 'Park', keywords: ['리더십'])
    map = ResearchMap.build([first, second], taxonomy)
    assert_equal 2, map['keywords'].length
    known = map['keywords'].find { |kw| kw['name'] == 'Leadership' }
    novel = map['keywords'].find { |kw| kw['name'].downcase == 'quantum mentoring' }
    assert_equal 'taxonomy', known['source']
    assert_equal 2, known['papers'].length
    assert_equal 'metadata', novel['source']
    assert_equal 1, novel['papers'].length
    assert_equal({ 'fi' => 1, 'name' => '새로운 연구 주제', 'en' => 'Emerging Topics', 'group' => 'Emerging Topics' }, map['fields'][novel['fi']])
    assert_equal 3, map['stats']['links']
    assert_equal 1, ResearchMap.build([first], taxonomy)['keywords'].length
    assert_equal 1, ResearchMap.build([], taxonomy)['fields'].length
  end

  def test_metadata_and_discovery_combine_all_support_for_the_same_keyword
    pubs = [paper('Quiet teams', keywords: ['Psychological safety']),
            paper('Psychological safety in schools', 'Park'),
            paper('Psychological safety at work', 'Song')]
    map = ResearchMap.build(pubs, taxonomy)
    keyword = map['keywords'].find { |entry| entry['name'].downcase == 'psychological safety' }
    assert_equal 'metadata', keyword['source']
    assert_equal 3, keyword['papers'].length
    assert_equal 3, map['stats']['links']
  end

  def test_discovers_repeated_english_title_phrases_without_generic_prose
    pubs = [paper('The effects of psychological safety on teams'),
            paper('Psychological safety and schools', 'Park'),
            paper('A study of the effects on teams', 'Song')]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal ['psychological safety'], map['keywords'].map { |kw| kw['name'] }
    kw = map['keywords'].first
    assert_equal 'title', kw['source']
    assert_equal 2, kw['papers'].length
    assert_equal 'Emerging Topics', map['fields'][kw['fi']]['group']
    assert_equal 2, map['extraction']['title_phrase_min_papers']
    assert_equal 24, map['extraction']['max_auto_keywords']
    removed = ResearchMap.build(pubs.drop(1), taxonomy)
    assert_empty removed['keywords']
  end

  def test_discovers_korean_compounds_after_removing_particles_not_academic_filler
    pubs = [paper('마키아벨리즘과 직무불안정성의 관계에 관한 연구'),
            paper('마키아벨리즘이 직무불안정성에 미치는 영향 분석', 'Park')]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal %w[마키아벨리즘 직무불안정성], map['keywords'].map { |kw| kw['name'] }.sort
    assert map['keywords'].all? { |kw| kw['source'] == 'title' && kw['papers'].length == 2 }
    assert_equal 2, map['extraction']['korean_compound_min_papers']
  end

  def test_suppresses_redundant_subphrases_with_identical_support
    pubs = [paper('Psychological safety climate'), paper('Psychological safety climate', 'Park')]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal ['psychological safety climate'], map['keywords'].map { |kw| kw['name'] }
  end

  def test_discovery_does_not_bridge_punctuation_or_taxonomy_concepts
    extra = { 'name' => '인지부하', 'en' => 'Cognitive Load', 'patterns' => ['cognitive load'] }
    terms = taxonomy
    terms[0]['keywords'] << extra
    pubs = [paper('Extraneous cognitive load: Quantum, mentoring'), paper('Extraneous cognitive load: Quantum, mentoring', 'Park')]
    map = ResearchMap.build(pubs, terms)
    assert_equal ['Cognitive Load'], map['keywords'].map { |kw| kw['name'] }
  end

  def test_english_single_words_require_three_papers_and_exclude_generic_words
    pubs = [paper('Technostress in organizational context'), paper('Technostress among school employees', 'Park'),
            paper('Technostress and organizational learning', 'Song')]
    assert_empty ResearchMap.build(pubs.first(2), taxonomy)['keywords']
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal ['technostress'], map['keywords'].map { |kw| kw['name'] }
    assert_equal 3, map['extraction']['english_word_min_papers']
  end

  def test_journal_boundary_preserves_commas_and_question_marks_in_titles
    pubs = [
      { 'year' => 2021, 'citation' => '김희선 (2021). 대학생활만족도가 첫 일자리 직무-전공 적합성, 직업가치, 현 일자리 만족도에 미치는 영향, 취업진로연구, 11(2), 1-22.', 'journal' => '취업진로연구' },
      { 'year' => 2022, 'citation' => 'Koo (2022). Is communication beneficial for teams? The Learning Organization, 29(2), 172-190.', 'journal' => 'The Learning Organization' }
    ]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal '대학생활만족도가 첫 일자리 직무-전공 적합성, 직업가치, 현 일자리 만족도에 미치는 영향', map['papers'][0]['name']
    assert_equal 'Is communication beneficial for teams?', map['papers'][1]['name']
  end

  def test_fixed_corpus_discovery_prefers_concepts_over_generic_fragments
    titles = [
      '마키아벨리즘과 적응수행의 관계에 관한 연구',
      '마키아벨리즘이 적응수행에 미치는 영향 분석',
      'Psychological ownership and emphasis manipulation through job autonomy',
      'Psychological ownership with emphasis manipulation and job autonomy'
    ]
    noise = "Career and developing and measurement and transformational and psychological and mutual and employees'. South Korea and Korean business context. 프로파일과 포레스트의 직렬다중매개효과 연구"
    pubs = (titles + [noise] * 3).each_with_index.map { |title, index| paper(title, "Author#{index}") }
    map = ResearchMap.build(pubs, taxonomy)
    names = map['keywords'].select { |kw| kw['source'] == 'title' }.map { |kw| kw['name'] }
    %w[마키아벨리즘 적응수행].concat(['psychological ownership', 'emphasis manipulation', 'job autonomy']).each do |name|
      assert_includes names, name
    end
    %w[career developing measurement transformational psychological mutual employees' 프로파일 포레스트 직렬다중매개효].concat(['south korea', 'korean business context']).each do |name|
      refute_includes names, name
    end
    assert_operator names.length, :<=, 24
  end

  def test_real_corpus_has_valid_graph_references_and_counts
    pubs = YAML.load_file(File.expand_path('../_data/publications.yml', __dir__))
    terms = YAML.load_file(File.expand_path('../_data/keyword_map.yml', __dir__))
    map = ResearchMap.build(pubs, terms)
    papers = map['papers'].to_h { |node| [node['id'], node] }
    keywords = map['keywords'].to_h { |node| [node['id'], node] }
    assert_equal map['papers'].length, papers.length
    assert_equal map['keywords'].length, keywords.length
    assert_equal({ 'papers' => papers.length, 'keywords' => keywords.length,
                   'links' => map['links'].length, 'visible' => papers.length + keywords.length }, map['stats'])
    assert_equal map['links'].uniq, map['links']
    map['fields'].each_with_index { |field, index| assert_equal index, field['fi'] }
    map['keywords'].each do |keyword|
      assert_includes (0...map['fields'].length), keyword['fi']
      assert_equal keyword['papers'].uniq, keyword['papers']
      keyword['papers'].each do |id|
        assert_includes papers.fetch(id)['kws'], keyword['id']
        assert_includes map['links'], { 'source' => keyword['id'], 'target' => id }
      end
    end
    map['papers'].each do |publication|
      assert_includes (-1...map['fields'].length), publication['fi']
      assert_equal publication['kws'].uniq, publication['kws']
      publication['kws'].each do |id|
        assert_includes keywords.fetch(id)['papers'], publication['id']
        assert_includes map['links'], { 'source' => id, 'target' => publication['id'] }
      end
    end
    map['links'].each do |link|
      assert_includes keywords.fetch(link['source'])['papers'], link['target']
      assert_includes papers.fetch(link['target'])['kws'], link['source']
    end
    assert_equal map['links'].length, map['keywords'].sum { |keyword| keyword['papers'].length }
    assert_equal map['links'].length, map['papers'].sum { |publication| publication['kws'].length }
    %w[taxonomy metadata title].each do |source|
      assert_equal map['keywords'].count { |keyword| keyword['source'] == source }, map['extraction']['keyword_sources'][source]
    end
    assert_operator map['keywords'].count { |keyword| keyword['source'] == 'title' }, :<=, 24
  end

  def test_cap_is_applied_after_known_concepts_are_excluded
    words = %w[adaptation autonomy belonging cohesion curiosity empathy flourishing grit happiness inclusion justice kindness loneliness mindfulness motivation optimism ownership persistence purpose resilience safety spirituality trust vitality wellbeing wisdom]
    pubs = words.flat_map { |word| [paper("Adaptive #{word}"), paper("Adaptive #{word}", 'Park')] }
    terms = [{ 'field' => 'Known', 'en' => 'Known', 'keywords' => [{ 'name' => '기존 주제', 'en' => 'Adaptive adaptation' }] }]
    map = ResearchMap.build(pubs, terms)
    automatic = map['keywords'].select { |kw| kw['source'] == 'title' }
    assert_equal 24, automatic.length
    refute automatic.any? { |kw| kw['name'] == 'adaptive adaptation' }
    assert_equal automatic.map { |kw| kw['name'] }, ResearchMap.build(pubs.reverse, terms)['keywords'].map { |kw| kw['name'] }
  end

  def test_citation_dedupe_merges_doi_and_metadata_from_duplicate_rows
    original = paper('Quiet workplaces')
    duplicate = original.merge('doi' => '10.1000/merged', 'keywords' => ['Acoustic inclusion'], 'title' => 'Explicit corrected title')
    map = ResearchMap.build([original, duplicate], taxonomy)
    assert_equal 1, map['stats']['papers']
    assert_equal 'Explicit corrected title', map['papers'].first['name']
    assert_equal 'Acoustic inclusion', map['keywords'].first['name']
    assert_equal [map['papers'].first['id']], map['keywords'].first['papers']
    assert_equal ResearchMap.build([duplicate], taxonomy)['papers'].first['id'], map['papers'].first['id']
  end

  def test_bad_taxonomy_regex_fails_with_field_keyword_and_pattern_context
    broken = taxonomy
    broken[0]['keywords'][0]['patterns'] = ['[unclosed']
    error = assert_raises(RegexpError) { ResearchMap.build([], broken) }
    assert_includes error.message, '조직행동'
    assert_includes error.message, '리더십'
    assert_includes error.message, '[unclosed'
  end

  def test_version_is_canonical_and_ids_survive_unrelated_additions
    pubs = [paper('Leadership at work'), paper('Leadership in schools', 'Park')]
    map = ResearchMap.build(pubs, taxonomy)
    reordered_keys = pubs.map { |publication| publication.to_a.reverse.to_h }
    assert_equal map['version'], ResearchMap.build(reordered_keys, taxonomy)['version']
    assert_equal map, ResearchMap.build(pubs, taxonomy)
    added = ResearchMap.build([paper('A new discovery', 'Seo')] + pubs, taxonomy)
    assert_equal map['papers'].map { |p| p['id'] }, added['papers'].drop(1).map { |p| p['id'] }
    assert_equal map['keywords'].first['id'], added['keywords'].first['id']
    refute_equal map['version'], added['version']
    changed_taxonomy = taxonomy
    changed_taxonomy[0]['keywords'][0]['also'] << 'New Group'
    refute_equal map['version'], ResearchMap.build(pubs, changed_taxonomy)['version']
  end

  def test_projection_is_immutable_valid_and_explains_extraction
    pubs = [paper('Leadership and psychological safety', keywords: ['Novel topic']), paper('Leadership through psychological safety', 'Park')]
    terms = taxonomy
    before = JSON.generate([pubs, terms])
    freeze_tree = lambda do |value|
      value.each { |key, item| freeze_tree.call(key); freeze_tree.call(item) } if value.is_a?(Hash)
      value.each { |item| freeze_tree.call(item) } if value.is_a?(Array)
      value.freeze
    end
    freeze_tree.call(pubs)
    freeze_tree.call(terms)
    map = ResearchMap.build(pubs, terms)
    assert_equal before, JSON.generate([pubs, terms])
    assert_equal map, JSON.parse(JSON.generate(map))
    by_id = (map['papers'] + map['keywords']).to_h { |node| [node['id'], node] }
    assert_equal map['stats']['visible'], by_id.length
    map['links'].each do |link|
      kw, publication = by_id.fetch(link['source']), by_id.fetch(link['target'])
      assert_equal 'kw', kw['type']
      assert_equal 'paper', publication['type']
      assert_includes kw['papers'], publication['id']
      assert_includes publication['kws'], kw['id']
    end
    assert_equal map['links'].length, map['keywords'].sum { |kw| kw['papers'].length }
    assert_equal map['links'].length, map['papers'].sum { |publication| publication['kws'].length }
    assert_equal 2, map['extraction']['taxonomy_min_papers']
    assert_equal 1, map['extraction']['metadata_min_papers']
    assert_equal({ 'taxonomy' => 1, 'metadata' => 1, 'title' => 1 }, map['extraction']['keyword_sources'])
    assert_equal [2, 3], map['extraction']['english_phrase_words']
    assert_equal 4, map['extraction']['korean_min_characters']
    assert_includes map['extraction']['stopwords']['english'], 'study'
    assert_includes map['extraction']['stopwords']['korean'], '매개효과'
    assert_includes map['extraction']['ranking'], 'support'
    assert_equal false, map['extraction']['external_services']
  end

  def test_conflicting_doi_titles_are_reported_not_silently_lost
    pubs = [paper('First title', doi: '10.1000/conflict'), paper('Entirely different title', 'Park', doi: '10.1000/conflict')]
    map = ResearchMap.build(pubs, taxonomy)
    assert_equal 2, map['stats']['papers']
    assert_equal ['First title', 'Entirely different title'], map['papers'].map { |row| row['name'] }
    assert_kind_of Array, map['extraction']['warnings']
    warning = map['extraction']['warnings'].first
    assert_equal 'duplicate_doi_conflict', warning['code']
    assert_equal 'doi:10.1000/conflict', warning['identity']
    assert_equal ['Entirely different title', 'First title'], warning['titles']
  end

  def test_jekyll_generator_rebuilds_site_data_without_source_writes
    require 'open3'
    require 'rbconfig'
    script = <<~'RUBY'
      require 'json'
      module Jekyll
        class Generator
          def self.safe(value); end
          def self.priority(value); end
        end
      end
      require ARGV.fetch(0)
      abort 'ResearchMap::Generator is missing' unless defined?(ResearchMap::Generator)
      site = Struct.new(:data).new({ 'preserved' => 'untouched' })
      generator = ResearchMap::Generator.new
      generator.generate(site)
      first = site.data['research_map']['stats']
      site.data['publications'] = [{ 'year' => 2026, 'citation' => 'Kim (2026). A new paper.' }]
      generator.generate(site)
      puts JSON.generate([first, site.data['research_map']['stats'], site.data['preserved']])
    RUBY
    output, error, status = Open3.capture3(RbConfig.ruby, '-e', script, File.expand_path('../_plugins/research_map.rb', __dir__))
    assert status.success?, error
    first, second, preserved = JSON.parse(output)
    assert_equal({ 'papers' => 0, 'keywords' => 0, 'links' => 0, 'visible' => 0 }, first)
    assert_equal({ 'papers' => 1, 'keywords' => 0, 'links' => 0, 'visible' => 1 }, second)
    assert_equal 'untouched', preserved
  end

  def test_empty_build_has_json_contract
    assert defined?(ResearchMap), 'ResearchMap module must be implemented'
    map = ResearchMap.build([], taxonomy)
    assert_equal %w[extraction fields keywords links papers stats version], map.keys.sort
    assert_equal({ 'papers' => 0, 'keywords' => 0, 'links' => 0, 'visible' => 0 }, map['stats'])
    assert_match(/\A[0-9a-f]{64}\z/, map['version'])
    assert_match(/\A[0-9a-f]{64}\z/, map['extraction']['algorithm_fingerprint'])
    assert_equal [{ 'fi' => 0, 'name' => '조직행동', 'en' => 'Behavior', 'group' => 'Org. Development' }], map['fields']
    assert_equal map, JSON.parse(JSON.generate(map))
  end
end
