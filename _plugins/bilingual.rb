# frozen_string_literal: true
require 'nokogiri'
require 'yaml'

# English editions reuse the Korean templates and data. Human-authored English
# copy lives in _data/english/text.yml and _translations/en (never an online MT).
# This first edition is gated by a local-only config until the owner reviews it.
module Bilingual
  CORE_ROUTES = %w[/ /members/ /research/ /research/lab/ /teaching/ /project/
                   /highlights/ /institutes/ /institutes/bk21/ /institutes/bk21-aix/
                   /institutes/curriculum/ /institutes/ecdi/ /institutes/humsoc/
                   /institutes/welfare/ /weekly-insight/ /weekly-insight/lab/
                   /weekly-insight/deep-research/ /conference/list/
                   /conference/ufhrd-2026/ /conference/asian-ahrd-2026/
                   /conference/kset-2026-2/ /conference/hrd-2026-2/
                   /appointment/ /appointment/admin/ /blog/].freeze

  def self.dictionary(site)
    %w[text apps conference measurement].map { |key| site.data.dig('english', key) || {} }.reduce({}, :merge)
  end

  def self.korean_only?(path)
    path.match?(%r{\A/(?:research-help|in-progress)(?:/|\z)}) ||
      (path.start_with?('/blog/') && path != '/blog/')
  end

  def self.translate(text, site)
    table = dictionary(site)
    stripped = text.strip
    result = table[stripped]
    if !result && stripped.include?(' · ')
      result = stripped.split(' · ').map { |part| translate(part, site) }.join(' · ')
    end
    if !result && stripped.start_with?('「') && stripped.end_with?('」')
      result = '“' + translate(stripped[1...-1], site) + '”'
    end
    if !result && (phase = stripped.match(/\A(.+)\(([12])단계 (\d+)차년도\)\z/))
      result = "#{translate(phase[1], site)} (Phase #{phase[2]}, Year #{phase[3]})"
    end
    if !result && (dated = stripped.match(/\A(\d{4}(?:-\d)?)\s*(.+)\z/)) && table[dated[2]]
      result = "#{dated[1]} · #{table[dated[2]]}"
    end
    result ||= stripped.sub(/\A총\s*(\d+)\s*(?:편|건)\z/, '\\1 entries')
    result = result.sub(/\A약\s*(\d+)\s*분\z/, 'Approx. \\1 min read')
    result = result.sub(/\A(\d+)개 (?:참고문헌|공식 출처)\z/, '\\1 sources')
    result = result.sub(/\A(\d+)개 소식/, '\\1 news item(s)')
    result = result.sub(/\A([\d,]+)원\z/, '\\1 KRW')
    result = result.sub(/전체 기간 · (.+) KST 확인/, 'All time · checked \\1 KST')
    result = result.sub(/전체 기간 · (.+) 기준/, 'All time · as of \\1')
    result = result.gsub(/([12])단계 (\d+)차년도/, 'Phase \\1, Year \\2')
    result = result.gsub(/(\d+)차년도/, 'Year \\1')
    result = result.sub(/총연구비 ([\d,]+)원/, 'Total Funding: \\1 KRW')
    return text if result == stripped
    text.sub(stripped, result)
  end

  class Generator < Jekyll::Generator
    safe true
    priority :lowest
    def generate(site)
      return unless site.config['bilingual_preview']
      source_pages = site.pages.select { |p| CORE_ROUTES.include?(p.url) }
      routes = source_pages.to_h { |p| [p.url, "/en#{p.url}"] }
      editions = []
      site.collections.fetch('insights').docs.each do |doc|
        next unless site.publisher.publish?(doc)
        path = File.join(site.source, '_translations', 'en', "#{doc.basename_without_ext}.md")
        next unless File.file?(path)
        front, body = File.read(path).split(/^---\s*$\n?/, 3).drop(1)
        raise "Missing English front matter: #{path}" unless front && body
        meta = YAML.safe_load(front, permitted_classes: [Date, Time], aliases: false)
        editions << [doc, meta, body]
        routes[doc.url] = "/en#{doc.url}"
      end
      # Review applications use their original HTML and data contracts. Snapshots
      # keep the local review reproducible without depending on sibling checkouts.
      app_pages = Dir[File.join(site.source, '_translations/apps/*/*.html')].map do |path|
        app = File.basename(File.dirname(path)); name = File.basename(path)
        route = "/#{app}/#{name == 'index.html' ? '' : name}"
        routes[route] = "/en#{route}"
        [path, route]
      end
      site.data['language_routes'] = routes
      source_pages.each { |source| add_edition(site, source, {}, source.content, routes) }
      editions.each { |source, meta, body| add_edition(site, source, meta, body, routes) }
      app_pages.each do |path, route|
        [route, routes[route]].each do |url|
          page = Jekyll::PageWithoutAFile.new(site, site.source, File.dirname(url), File.basename(url.end_with?('/') ? url + 'index.html' : url))
          page.data = { 'layout' => nil, 'permalink' => url, 'lang' => url.start_with?('/en/') ? 'en' : 'ko',
            'korean_url' => route, 'english_url' => routes[route], 'standalone_review' => true }
          page.content = File.read(path)
          site.pages << page
        end
      end
      # Static runtime assets have already been edited as English source; the
      # compiler is an editorial tool and is not needed on the deployment runner.
      { '_translations/apps' => '', '_translations/runtime' => '/en' }.each do |source_dir, prefix|
        Dir[File.join(site.source, source_dir, '**/*')].select { |p| File.file?(p) }.each do |path|
          relative = path.delete_prefix(File.join(site.source, source_dir) + '/')
          next if source_dir.end_with?('/apps') && File.dirname(relative).split('/').size == 1 && relative.end_with?('.html')
          # StaticFile reads from its base+dir, so use the actual source and only
          # override destination for the generated language directory.
          file = Jekyll::StaticFile.new(site, File.join(site.source, source_dir), File.dirname(relative), File.basename(path))
          file.define_singleton_method(:destination) { |dest| File.join(dest, prefix, relative) }
          site.static_files << file
        end
      end
      site.data['english_insights'] = editions.to_h { |source, meta, _| [source.url, meta] }
    end

    def add_edition(site, source, meta, body, routes)
      url = routes.fetch(source.url)
      source.data['english_url'] = url
      source.data['korean_url'] = source.url
      extension = File.extname(source.path) == '.md' ? '.md' : '.html'
      page = Jekyll::PageWithoutAFile.new(site, site.source, url.delete_prefix('/'), "index#{extension}")
      page.data = source.data.dup.merge(meta).merge('lang' => 'en', 'locale' => 'en_US',
        'permalink' => url, 'korean_url' => source.url, 'english_url' => url)
      references = source.content.split('### References', 2)
      page.data['original_references'] = references.last if references.size == 2
      page.data['original_figures'] = source.content.scan(/<figure[\s\S]*?<\/figure>/)
      if source.is_a?(Jekyll::Document)
        raw = Nokogiri::HTML5.fragment(site.find_converter_instance(Jekyll::Converters::Markdown).convert(source.content))
        page.data['original_heading_ids'] = %w[h2 h3].to_h { |tag| [tag, raw.css("#{tag}[id]").map { |h| h['id'] }] }
      end
      page.data['banner'] ||= source.url.split('/')[1]
      page.data['reading_minutes'] = [(body.split.size / 220.0).ceil, 1].max if source.is_a?(Jekyll::Document)
      %w[title lede summary description heading_main heading_suffix author].each do |key|
        page.data[key] = Bilingual.translate(page.data[key], site) if page.data[key].is_a?(String)
      end
      if !page.data['description'] || page.data['description'].match?(/[가-힣]/)
        page.data['description'] = meta['summary'] || 'PRO AnalytiX Lab, led by Professor Ji Hoon Song at Hanyang University.'
      end
      page.content = body
      site.pages << page
    end
  end

  def self.render_english(page)
    return unless page.site.config['bilingual_preview']
    if page.data['standalone_review']
      page.output = decorate_review(page)
    end
    return unless page.data['lang'] == 'en'
    html = Nokogiri::HTML5(page.output)
    figure_copy = page.site.data.dig('english', 'figure_labels', page.data['korean_url'])
    if figure_copy
      source = Nokogiri::HTML5.fragment(page.data.fetch('original_figures').first).at_css('figure')
      translated = html.at_css('.daily-content figure')
      if source && translated
        source.css('svg text').zip(figure_copy.fetch('labels')).each { |label, copy| label.content = copy }
        source.at_css('svg')['aria-label'] = figure_copy.fetch('aria')
        source.at_css('figcaption').replace(translated.at_css('figcaption').dup)
        translated.replace(source)
      end
    end
    # Match the Korean Insight callout markup, including its citation and body spacing.
    html.css('.daily-content .daily-brief').each do |brief|
      children = brief.element_children
      next unless children.length >= 3 && children[0].name == 'h3'
      children[0].remove_attribute('id')
      children[1]['class'] = [children[1]['class'], 'daily-brief-cite'].compact.join(' ')
      body = Nokogiri::XML::Node.new('div', html)
      body['class'] = 'daily-brief-body'
      children[2..].each { |child| body.add_child(child) }
      brief.add_child(body)
    end
    html.css('script, style').each { |el| el['data-language-original'] = 'true' }
    html.xpath('//text()').each do |node|
      next if node.ancestors.any? { |a| %w[script style].include?(a.name) }
      node.content = translate(node.text, page.site)
    end
    title = html.at_css('title')
    if title && title.text.match?(/[가-힣]/)
      title.content = title.text.gsub('한양대학교 교육공학과 송지훈 교수 연구실', "Professor Ji Hoon Song's Lab, Hanyang University")
    end
    html.css('[aria-label], [title], [alt], [placeholder], [data-label], [data-lecture-name], [data-lecture-topic]').each do |node|
      %w[aria-label title alt placeholder data-label data-lecture-name data-lecture-topic].each do |attr|
        node[attr] = translate(node[attr], page.site) if node[attr]
      end
    end
    %w[lecture-network-data lecture-topic-data banner-orbit-items].each do |id|
      el = html.at_css("script##{id}")
      el.content = translate_data(JSON.parse(el.content), page.site).to_json if el
    end
    html.css('a[href]').each do |node|
      next if node['data-language-choice']
      href = node['href']
      href = href.sub(%r{\Ahttps://(?:hrdpro\.hanyang\.ac\.kr|drsprolab\.github\.io)(?=/)}, '')
      next unless href.start_with?('/') && !href.start_with?('//')
      node['href'] = href
      path, suffix = href.split(/(?=[?#])/, 2)
      translated = page.site.data.fetch('language_routes', {})[path]
      node['href'] = translated + suffix.to_s if translated
    end
    if page.site.config['preview'] && page.data['korean_url'] == '/appointment/'
      form = html.at_css('#appointment-form')
      if form
        form['action'] = '#'
        form.at_css('[type="submit"]')['disabled'] = 'disabled'
        notice = Nokogiri::XML::Node.new('p', html)
        notice['class'] = 'english-original-note'
        notice.content = 'Local preview: meeting requests are disabled.'
        form.add_previous_sibling(notice)
      end
    end
    (page.data['original_heading_ids'] || {}).each do |tag, ids|
      headings = html.css(".daily-content #{tag}[id]")
      headings.zip(ids).each { |heading, id| heading['id'] = id } if headings.size == ids.size
    end
    # English concept names need two lines in the original compact KM boxes.
    html.css('.km-fig svg text').each do |label|
      words = { 'Individual knowledge' => ['Individual ', 'knowledge'],
                'Organizational Learning' => ['Organizational ', 'learning'] }[label.text]
      next unless words
      label['aria-label'] = label.text
      label.content = ''
      words.each_with_index do |word, i|
        span = Nokogiri::XML::Node.new('tspan', html)
        span['x'] = label['x']
        span['y'] = (label['y'].to_f - 5 + i * 12).to_s
        span.content = word
        label.add_child(span)
      end
    end
    schedule = html.at_css('#conference-schedule')
    schedule.content = JSON.parse(schedule.content).map { |event| event.merge('url' => '/en' + event['url']) }.to_json if schedule
    html.css('script[src], iframe[src], a[href]').each do |el|
      attr = el['src'] ? 'src' : 'href'
      value = el[attr]
      if value.match?(%r{\A/assets/(?:js/appointment(?:-admin)?\.js|conference/[^/]+\.html)})
        el[attr] = '/en' + value
      end
    end
    # Bibliographic records and personal names retain the source spelling.
    html.css('.cite').each { |el| el['lang'] = 'ko' if el.text.match?(/[가-힣]/) }
    html.css('svg[aria-label]').each do |svg|
      caption = svg.ancestors('figure').first&.at_css('figcaption')
      svg['aria-label'] = caption.text.strip if caption && svg['aria-label'].match?(/[가-힣]/)
    end
    html.css('a[href]').select { |link| korean_only?(link['href'].split(/[?#]/).first) }.each do |link|
      link.xpath('.//text()').each { |text| text.content = text.text.sub(/\s*\(Korean\)/, '') }
      link['hreflang'] = 'ko'
      link['title'] = 'This section is currently available in Korean.'
      next unless link.ancestors('.submenu, .submenu-sub').any?
      label = Nokogiri::XML::Node.new('span', html)
      label['class'] = 'language-only'
      label.content = ' (Korean only)'
      link.add_child(label)
    end
    if page.data['korean_url'] == '/blog/'
      html.css('.inst-thumb[src^="/assets/og/measurement/"]').each do |image|
        image['src'] = image['src'].sub('/measurement/', '/measurement-en/')
      end
    end
    map = html.at_css('#rmap')
    map.add_next_sibling('<p class="english-original-note">Paper titles and bibliographic details retain their original publication language.</p>') if map
    if %w[/research/ /research/lab/ /institutes/ecdi/].include?(page.data['korean_url'])
      anchor = html.at_css('main .prose > .tabs') || html.at_css('main .page-head')
      if anchor
        note = Nokogiri::XML::Node.new('p', html)
        note['class'] = 'english-original-note'
        note.content = 'Bibliographic entries retain the original publication language to preserve titles, author names, and citation details.'
        anchor.add_next_sibling(note)
      end
    end
    page.output = html.to_html
  end

  def self.decorate_review(page)
    html = Nokogiri::HTML5(page.output)
    lang = page.data['lang']; html.at_css('html')['lang'] = lang
    html.at_css('body')['data-hit-api'] = ''
    ko = page.data['korean_url']; en = page.data['english_url']
    html.at_css('head').add_child('<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/language.css">')
    html.at_css('head').add_child(%(<link rel="canonical" href="#{page.site.config['url']}#{lang == 'en' ? en : ko}">))
    html.at_css('head').add_child(%(<link rel="alternate" hreflang="ko" href="#{page.site.config['url']}#{ko}"><link rel="alternate" hreflang="en" href="#{page.site.config['url']}#{en}">))
    switch = %(<div class="language-switch" role="group" aria-label="Language"><a href="#{ko}" data-language-choice="ko" #{'aria-current="true"' if lang == 'ko'}>KOR</a><span>/</span><a href="#{en}" data-language-choice="en" #{'aria-current="true"' if lang == 'en'}>ENG</a></div>)
    (html.at_css('.header-actions') || html.at_css('header')).add_child(switch)
    html.at_css('body').add_child(%(<script id="language-routing" type="application/json">#{page.site.data['language_routes'].to_json}</script><script src="/assets/js/language.js"></script>))
    # Local preview reads existing data but cannot submit or alter live records.
    message = lang == 'en' ? 'Local preview: submissions and changes are disabled.' : '미리보기에서는 제출 및 변경할 수 없습니다.'
    if page.site.config['preview']
      guard = %(<script>(function(){var original=window.fetch;window.fetch=function(url,options){if(options&&String(options.method).toUpperCase()==='POST'){var data={};try{data=JSON.parse(options.body)}catch(_){}if(!['best-auth','auth'].includes(data.action))return Promise.reject(new Error(#{message.to_json}));}return original.apply(this,arguments);};})();</script>)
      html.at_css('head').add_child(guard)
    end
    if lang == 'en'
      html.css('script[src]').each { |el| el['src'] = '/en' + ko.sub(%r{/[^/]*\z}, '/') + el['src'] if el['src'].start_with?('js/') }
      html.css('link[href], img[src]').each do |el|
        attr = el['src'] ? 'src' : 'href'
        el[attr] = ko.sub(%r{/[^/]*\z}, '/') + el[attr] unless el[attr].match?(%r{\A(?:/|https?:)})
      end
      html.css('a[href^="https://hrdpro.hanyang.ac.kr/"]').each { |a| a['href'] = '/en/' }
      note = Nokogiri::XML::Node.new('p', html)
      note['class'] = 'english-original-note'
      note.content = 'The interface is in English. Submitted reviews, diagrams, names, and bibliographic records retain their original language.'
      html.at_css('main').prepend_child(note)
    end
    html.to_html
  end

  def self.translate_data(value, site)
    case value
    when Hash then value.to_h { |k, v| [translate(k, site), translate_data(v, site)] }
    when Array then value.map { |v| translate_data(v, site) }
    when String then translate(value, site)
    else value
    end
  end
end

Jekyll::Hooks.register :pages, :post_render do |page|
  Bilingual.render_english(page)
end
