# NEW 표시용 데이터 — "새로 올라온 것"만 센다. 이미 있던 항목의 수정(오탈자·DOI·제목 다듬기 등)은 제외한다.
#   site.data["item_updates"]: 최근 7일 안에 새로 추가된 항목 [{ "t" => 추가 시각(유닉스 초), "s" => 대표 글(제목·인용·이름), "u" => 메뉴 url }]
#     - YAML 데이터 파일: 최근 커밋들을 차례로 비교해 처음 나타난 항목만 고른다. 비슷한 항목이 이전 버전에 있었으면 '수정'으로 본다.
#     - Weekly Insight·Measurement 글처럼 파일 하나가 글 하나인 경우: 파일이 처음 추가된 시각.
#   site.data["nav_updated"]: 메뉴(url)별 가장 최근 추가 시각 → 상단 메뉴 NEW 배지 (_includes/header.html)
#   site.data["nav_changes"]: NEW 를 보는 메뉴 url 목록 (값은 빈 배열; 페이지가 어느 메뉴에 속하는지 찾는 데만 씀)
# 실제로 NEW 를 보일지는 방문 시각 기준 3일(72시간)로 브라우저에서 판단한다 (assets/js/nav.js).
require "open3"
require "yaml"
require "date"

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
      @root = site.source
      shallow, = git("rev-parse", "--is-shallow-repository")
      return if shallow.strip != "false"

      cutoff = Time.now.to_i - LOOKBACK
      docs = {}
      site.collections.each_value { |c| c.docs.each { |d| docs[d.relative_path] = d } }
      found = {} # [메뉴 url, 대표 글] => 추가 시각

      Array(site.data["navigation"]).each do |item|
        paths = Array(item["watch"])
        next if paths.empty?
        url = item["url"]
        site.data["nav_changes"][url] = []
        files, = git("ls-files", "--", *paths)
        files.lines.map(&:chomp).each do |f|
          if f =~ /\.ya?ml\z/
            added_items(f, cutoff).each { |s, t| found[[url, s]] = t }
          elsif (doc = docs[f]) && doc.data["title"]
            t, = git("log", "--diff-filter=A", "-1", "--format=%ct", "--", f)
            found[[url, doc.data["title"].to_s]] = t.to_i if t.to_i >= cutoff
          end
        end
      end

      site.data["item_updates"] = found.map { |(u, s), t| { "t" => t, "s" => s, "u" => u } }
      found.each { |(u, _), t| site.data["nav_updated"][u] = [site.data["nav_updated"][u].to_i, t].max }
    rescue StandardError => e
      Jekyll.logger.warn "item_updates:", e.message
    end

    private

    def git(*args)
      Open3.capture2("git", "-C", @root, *args)
    end

    # 최근 커밋마다 파일 내용을 앞 버전과 비교해, 새로 생긴 항목과 그 시각을 돌려준다.
    def added_items(file, cutoff)
      log, = git("log", "--since=#{cutoff}", "--reverse", "--format=%H %ct", "--", file)
      commits = log.lines.map(&:split)
      return {} if commits.empty?

      prev = items_at("#{commits.first[0]}^", file)
      added = {}
      commits.each do |sha, ct|
        cur = items_at(sha, file)
        (cur - prev).each do |s|
          base = prev.find { |p| similar?(p, s) }
          if base.nil? then added[s] ||= ct.to_i            # 새 항목
          elsif added[base] then added[s] ||= added[base]   # 새로 올린 항목을 곧바로 고친 것: 처음 올린 시각 유지
          end                                                # 그 밖에는 기존 항목 수정 → NEW 아님
        end
        prev = cur
      end
      current = items_at("HEAD", file)
      added.select { |s, _| current.include?(s) } # 그 뒤 다시 고쳐졌거나 삭제된 항목은 제외
    end

    def items_at(rev, file)
      text, status = git("show", "#{rev}:#{file}")
      return [] unless status.success?
      data = YAML.safe_load(text, permitted_classes: [Date, Time], aliases: true)
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
