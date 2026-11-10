# NEW 표시용 데이터 — "새로 올라온 것"만 센다. 이미 있던 항목의 수정(오탈자·DOI·제목 다듬기 등)은 제외한다.
#   site.data["item_updates"]: 최근 7일 안에 새로 추가된 항목 [{ "t" => 추가 시각(유닉스 초), "s" => 대표 글(제목·인용·이름), "u" => 메뉴 url }]
#     - YAML 데이터 파일: 최근 커밋들을 차례로 비교해 처음 나타난 항목만 고른다. 비슷한 항목이 이전 버전에 있었으면 '수정'으로 본다.
#     - Weekly Insight·Measurement 글처럼 파일 하나가 글 하나인 경우: 파일이 처음 추가된 시각.
#   site.data["nav_updated"]: 메뉴(url)별 가장 최근 추가 시각 → 상단 메뉴 NEW 배지 (_includes/header.html)
#   site.data["subnav_updated"]: 하위 메뉴(url)별 가장 최근 추가 시각 → 드롭다운 하위 메뉴 NEW 배지
#     - Weekly Insight 글은 머리말 section 값으로 DrS / Lab / Deep Research 중 어디에 올라갔는지 나눈다.
#   site.data["nav_changes"]: NEW 를 보는 메뉴 url 목록 (값은 빈 배열; 페이지가 어느 메뉴에 속하는지 찾는 데만 씀)
# 실제로 NEW 를 보일지는 방문 시각 기준 7일로 브라우저에서 판단한다 (assets/js/nav.js).
require "open3"
require "yaml"
require "date"
require "time"

module ItemUpdates
  LOOKBACK = 7 * 24 * 3600
  TITLE_KEYS = %w[citation title name ko field text].freeze

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      site.data["item_updates"] = []
      site.data["nav_updated"] = {}
      site.data["nav_changes"] = {}
      site.data["subnav_updated"] = {}
      @root = site.source
      mark_conferences(site)
      shallow, = git("rev-parse", "--is-shallow-repository")
      return if shallow.strip != "false"

      cutoff = Time.now.to_i - LOOKBACK
      docs = {}
      site.collections.each_value { |c| c.docs.each { |d| docs[d.relative_path] = d } }
      found = {} # [메뉴 url, 대표 글] => 추가 시각

      Array(site.data["navigation"]).each do |item|
        mark_children(site, item, docs, cutoff)
        paths = Array(item["watch"])
        next if paths.empty?
        url = item["url"]
        site.data["nav_changes"][url] = []
        files, = git("ls-files", "--", *paths)
        files.lines.map(&:chomp).each do |f|
          if f =~ /\.(?:ya?ml|json)\z/
            added_items(f, cutoff).each { |s, t| found[[url, s]] = t }
          elsif (doc = docs[f]) && doc.data["title"]
            t = published_at(f)
            found[[url, doc.data["title"].to_s]] = t if t >= cutoff
            # 영문판 카드는 번역된 제목으로 나오므로 영문 제목도 같은 시각의 새 글로 등록한다
            # 영문판이 한글보다 나중에 추가되면 그때를 영문판의 새 글 시각으로 본다(영문판 업데이트도 NEW)
            en = english_title(doc)
            latest = [t, translation_added_at(doc)].max
            found[[url, en]] = latest if en && latest >= cutoff
            if latest >= cutoff && (sub = submenu_url(doc))
              site.data["subnav_updated"][sub] = [site.data["subnav_updated"][sub].to_i, latest].max
            end
          elsif (title = page_title(f))
            t = published_at(f)
            found[[url, title]] = t if t >= cutoff
          end
        end
      end

      # 영문판 목록은 영어 사전(_data/english)으로 번역된 제목이 나오므로, 번역된 제목도 같은 새 항목으로 등록한다
      if defined?(Bilingual)
        found.to_a.each do |(u, s), t|
          en = Bilingual.translate(s.to_s, site).to_s.strip
          found[[u, en]] ||= t if !en.empty? && en != s.to_s.strip
        end
      end

      site.data["item_updates"] = found.map { |(u, s), t| { "t" => t, "s" => s, "u" => u } }
      found.each { |(u, _), t| site.data["nav_updated"][u] = [site.data["nav_updated"][u].to_i, t].max }
    rescue StandardError => e
      Jekyll.logger.warn "item_updates:", e.message
    end

    private

    # 컨퍼런스 NEW는 등록 시점부터 종료일 당일까지 유지한다(KST).
    def mark_conferences(site)
      Array(site.data["navigation"]).each do |item|
        Array(item["children"]).each do |child|
          next unless child["url"] == "/conference/"
          deadlines = Array(child["children"]).filter_map do |event|
            next unless event["ends_on"]
            event["new_until"] = Time.parse("#{event['ends_on']} 23:59:59 +09:00").to_i
          end
          child["new_until"] = deadlines.max if deadlines.any?
        end
      end
    end

    def page_title(file)
      return nil unless file.match?(/\.(?:md|html)\z/)
      front = File.read(File.join(@root, file), encoding: "utf-8")[/\A---\s*\n(.*?)\n---/m, 1]
      data = front && YAML.safe_load(front, permitted_classes: [Date, Time])
      data["title"] if data && data["published"] != false
    rescue StandardError
      nil
    end

    # 영문판(_translations/en/<글 파일 이름>.md)이 처음 추가된 시각(없으면 0)
    def translation_added_at(doc)
      file = "_translations/en/#{File.basename(doc.relative_path, '.*')}.md"
      return 0 unless File.exist?(File.join(@root, file))
      added, = git("log", "--diff-filter=A", "-1", "--format=%ct", "--", file)
      # 영문판을 처음 연 날(일괄 추가)에 올라온 번역은 '새 영문판'으로 세지 않는다 — 그 뒤에 따로 추가·보강된 영문판만 NEW
      added.to_i > english_launch + 86_400 ? added.to_i : 0
    end

    # 영문판 번역이 처음 올라온 시각(저장소에서 가장 이른 번역 파일 추가 시각)
    def english_launch
      @english_launch ||= begin
        times, = git("log", "--diff-filter=A", "--format=%ct", "--", "_translations/en")
        times.lines.map(&:to_i).min || Time.now.to_i
      end
    end

    # _translations/en/<글 파일 이름>.md 머리말의 영문 title (없으면 nil)
    def english_title(doc)
      path = File.join(@root, "_translations", "en", "#{File.basename(doc.relative_path, '.*')}.md")
      return nil unless File.exist?(path)
      front = File.read(path, encoding: "utf-8")[/\A---\s*\n(.*?)\n---/m, 1]
      title = front && YAML.safe_load(front, permitted_classes: [Date, Time])&.fetch("title", nil)
      title.to_s.strip.empty? ? nil : title.to_s
    rescue StandardError
      nil
    end

    # 하위 메뉴(children)에 watch 가 있으면, 거기서 최근 새로 추가된 것의 시각을 subnav_updated 에 넣는다.
    # 예: Awards & Gallery 의 Awards 는 _data/member_awards.yml, Gallery 는 _data/gallery.yml 에 새 항목이 생겼을 때만 NEW.
    def mark_children(site, item, docs, cutoff)
      Array(item["children"]).each do |child|
        paths = Array(child["watch"])
        next if paths.empty?
        files, = git("ls-files", "--", *paths)
        files.lines.map(&:chomp).each do |f|
          t = if f =~ /\.(?:ya?ml|json)\z/
                scope = f.end_with?("publications.yml") ? child["watch_scope"] : nil
                added_items(f, cutoff, child["watch_sections"], scope).values.max
              elsif (doc = docs[f]) && doc.data["title"]
                added = [published_at(f), translation_added_at(doc)].max
                added if added >= cutoff
              elsif page_title(f)
                added = published_at(f)
                added if added >= cutoff
              end
          next unless t
          site.data["subnav_updated"][child["url"]] = [site.data["subnav_updated"][child["url"]].to_i, t].max
        end
      end
    end

    # 글이 사이트에 처음 보이게 된 시각. 파일을 추가한 시각이지만, 숨겨 둔 글(published: false)을 나중에 공개했다면 그 공개 시각.
    def published_at(file)
      added, = git("log", "--diff-filter=A", "-1", "--format=%ct", "--", file)
      time = added.to_i
      current, status = git("show", "HEAD:#{file}")
      if status.success? && current !~ /^published:\s*false\s*$/
        toggled, = git("log", "-S", "published: false", "--format=%ct", "--", file)
        time = [time, toggled.lines.map(&:to_i).max.to_i].max
      end
      time
    end

    # Weekly Insight 글이 속한 하위 메뉴 (_data/navigation.yml 의 Weekly Insight children)
    def submenu_url(doc)
      return nil unless doc.collection&.label == "insights"
      case doc.data["section"]
      when "lab" then "/weekly-insight/lab/"
      when "deep-research" then "/weekly-insight/deep-research/"
      else "/weekly-insight/"
      end
    end

    def git(*args)
      Open3.capture2("git", "-C", @root, *args)
    end

    # 최근 커밋마다 파일 내용을 앞 버전과 비교해, 새로 생긴 항목과 그 시각을 돌려준다.
    def added_items(file, cutoff, sections = nil, scope = nil)
      log, = git("log", "--since=#{cutoff}", "--reverse", "--format=%H %ct", "--", file)
      commits = log.lines.map(&:split)
      return {} if commits.empty?

      prev = items_at("#{commits.first[0]}^", file, sections, scope)
      added = {}
      commits.each do |sha, ct|
        cur = items_at(sha, file, sections, scope)
        (cur - prev).each do |s|
          base = prev.find { |p| similar?(p, s) }
          if base.nil? then added[s] ||= ct.to_i            # 새 항목
          elsif added[base] then added[s] ||= added[base]   # 새로 올린 항목을 곧바로 고친 것: 처음 올린 시각 유지
          end                                                # 그 밖에는 기존 항목 수정 → NEW 아님
        end
        prev = cur
      end
      current = items_at("HEAD", file, sections, scope)
      added.select { |s, _| current.include?(s) } # 그 뒤 다시 고쳐졌거나 삭제된 항목은 제외
    end

    def items_at(rev, file, sections = nil, scope = nil)
      text, status = git("show", "#{rev}:#{file}")
      return [] unless status.success?
      data = YAML.safe_load(text, permitted_classes: [Date, Time], aliases: true)
      data = data.slice(*sections) if sections && data.is_a?(Hash)
      data = data.select { |item| item.is_a?(Hash) && item[scope] == true } if scope && data.is_a?(Array)
      out = []
      collect(data, false, out)
      out.uniq
    rescue StandardError
      []
    end

    # 제목이 있는 항목(논문 인용, 프로젝트 제목, 이름 등)과, 제목 없는 목록의 글 항목을 모은다.
    # 제목 있는 항목 안의 태그 목록 등은 그 항목의 일부로 보고 따로 세지 않는다.
    def collect(node, inside_titled, out)
      case node
      when Hash
        key = TITLE_KEYS.find { |k| node[k].is_a?(String) && long_enough?(node[k]) }
        out << node[key].strip if key
        node.each_value { |v| collect(v, inside_titled || !key.nil?, out) }
      when Array
        node.each do |v|
          if v.is_a?(String)
            out << v.strip if !inside_titled && long_enough?(v)
          else
            collect(v, inside_titled, out)
          end
        end
      end
    end

    def long_enough?(s)
      core = s.gsub(/[^0-9A-Za-z가-힣]/, "")
      core.size >= (core =~ /[가-힣]/ ? 3 : 6)
    end

    def norm(s) = s.downcase.gsub(/[^0-9a-z가-힣]/, "")

    # 같은 항목을 고친 것인지: 앞부분이 같거나 글자쌍이 60% 이상 겹치면 같은 항목으로 본다.
    def similar?(a, b)
      x, y = norm(a), norm(b)
      return true if x.size >= 12 && x[0, 25] == y[0, 25]
      bx = x.chars.each_cons(2).map(&:join)
      by = y.chars.each_cons(2).map(&:join)
      return false if bx.empty? || by.empty?
      2.0 * (bx & by).size / (bx.size + by.size) >= 0.6
    end
  end
end
