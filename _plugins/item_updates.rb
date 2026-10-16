# 메뉴 안에서 "무엇이" 바뀌었는지 보여 주기 위한 데이터 (assets/js/nav.js 가 사용)
#   site.data["item_updates"]: 최근 7일 안에 바뀐 목록 항목들 [{ "t" => 유닉스 초, "s" => 대표 글(논문 인용, 제목, 이름 등), "u" => 메뉴 url }]
#     - YAML 데이터 파일은 git blame 으로 줄마다 마지막 수정 시각을 읽고, 바뀐 줄이 속한 "- " 항목을 찾는다.
#     - Weekly Insight·Measurement 글처럼 파일 하나가 항목 하나인 경우는 그 글의 제목을 쓴다.
#   site.data["nav_changes"]: 메뉴 url 목록 (값은 빈 배열). 커밋 메시지는 페이지에 싣지 않는다.
# 실제로 NEW 를 보일지는 방문 시각 기준 48시간으로 브라우저에서 판단한다(메뉴 NEW 배지와 같은 기준).
require "open3"
require "yaml"
require "date"

module ItemUpdates
  RECENT = 7 * 24 * 3600
  TITLE_KEYS = %w[citation title name ko field text].freeze

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      site.data["item_updates"] = []
      site.data["nav_changes"] = {}
      @root = site.source
      shallow, = git("rev-parse", "--is-shallow-repository")
      return if shallow.strip != "false"

      cutoff = Time.now.to_i - RECENT
      docs = {}
      site.collections.each_value { |c| c.docs.each { |d| docs[d.relative_path] = d } }
      found = {} # [메뉴 url, 대표 글] => 시각

      Array(site.data["navigation"]).each do |item|
        paths = Array(item["watch"])
        next if paths.empty?

        site.data["nav_changes"][item["url"]] = [] # '최근 업데이트' 안내 상자는 쓰지 않음: 메뉴 url만 남김

        files, = git("ls-files", "--", *paths)
        files.lines.map(&:chomp).each do |f|
          if f =~ /\.ya?ml\z/
            yaml_items(f, cutoff).each { |s, t| k = [item["url"], s]; found[k] = [found[k].to_i, t].max }
          elsif (doc = docs[f]) && doc.data["title"]
            t, = git("log", "-1", "--format=%ct", "--", f)
            k = [item["url"], doc.data["title"].to_s]
            found[k] = [found[k].to_i, t.to_i].max if t.to_i >= cutoff
          end
        end
      end

      site.data["item_updates"] = found.map { |(u, s), t| { "t" => t, "s" => s, "u" => u } }
    rescue StandardError => e
      Jekyll.logger.warn "item_updates:", e.message
    end

    private

    def git(*args)
      Open3.capture2("git", "-C", @root, *args)
    end

    # 바뀐 줄이 속한 "- " 항목의 대표 글(제목·인용·이름)을 돌려준다.
    def yaml_items(file, cutoff)
      out, status = git("blame", "-w", "--line-porcelain", "--", file)
      return [] unless status.success?

      lines = []
      time = 0
      out.each_line do |l|
        if l.start_with?("committer-time ")
          time = l.split.last.to_i
        elsif l.start_with?("\t")
          lines << [l[1..].chomp, time]
        end
      end

      result = {}
      lines.each_with_index do |(text, t), i|
        next if t < cutoff || text.strip.empty? || text.strip.start_with?("#")
        s = nil
        j = item_start(lines, i)
        # 태그처럼 제목이 없는 하위 항목이 바뀌면, 그 항목이 속한 논문·사람 등 상위 항목을 표시한다.
        while j
          kind, str = primary(block(lines, j))
          parent = parent_item(lines, j)
          if kind == :titled || (kind == :string && parent.nil?)
            s = str
            break
          end
          j = parent
        end
        result[s] = [result[s].to_i, t].max if s
      end
      result
    end

    def indent(text) = text[/\A */].size

    def item_start(lines, i)
      text = lines[i][0]
      return i if text =~ /\A\s*- /
      ind = indent(text)
      (i - 1).downto(0) do |j|
        tj = lines[j][0]
        next if tj.strip.empty?
        return j if tj =~ /\A\s*- / && indent(tj) < ind
        return nil if indent(tj) < ind && tj !~ /\A\s*- /
      end
      nil
    end

    def parent_item(lines, j)
      ind = indent(lines[j][0])
      (j - 1).downto(0) do |k|
        tk = lines[k][0]
        next if tk.strip.empty? || indent(tk) >= ind
        return k if tk =~ /\A\s*- /
        return nil if indent(tk).zero?
        ind = indent(tk)
      end
      nil
    end

    def block(lines, start)
      ind = indent(lines[start][0])
      body = [lines[start][0]]
      (start + 1...lines.size).each do |k|
        tk = lines[k][0]
        break if !tk.strip.empty? && indent(tk) <= ind
        body << tk
      end
      body.map { |b| b[ind..] || "" }.join("\n")
    end

    def primary(text)
      data = YAML.safe_load(text, permitted_classes: [Date, Time], aliases: true)
      v = data.is_a?(Array) ? data.first : data
      kind, s =
        case v
        when String then [:string, v]
        when Hash
          key = TITLE_KEYS.find { |k| v[k].is_a?(String) && !v[k].strip.empty? }
          key ? [:titled, v[key]] : [:untitled, nil]
        else [:untitled, nil]
        end
      core = s.to_s.gsub(/[^0-9A-Za-z가-힣]/, "")
      return [:untitled, nil] unless core.size >= (core =~ /[가-힣]/ ? 3 : 6)
      [kind, s.strip]
    rescue StandardError
      [:untitled, nil]
    end
  end
end
