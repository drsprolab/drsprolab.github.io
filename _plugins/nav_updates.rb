# 메뉴별 마지막 내용 수정 시각을 git 기록에서 읽어 site.data.nav_updated[url] = 유닉스 초 로 넣는다.
# 얕은 클론(커밋 기록이 1개뿐)에서는 모든 파일이 방금 바뀐 것처럼 보이므로 아무것도 표시하지 않는다.
require "open3"

module NavUpdates
  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      site.data["nav_updated"] = {}
      root = site.source
      shallow, = Open3.capture2("git", "-C", root, "rev-parse", "--is-shallow-repository")
      return if shallow.strip != "false"
      Array(site.data["navigation"]).each do |item|
        paths = Array(item["watch"])
        next if paths.empty?
        out, status = Open3.capture2("git", "-C", root, "log", "-1", "--format=%ct", "--", *paths)
        site.data["nav_updated"][item["url"]] = out.strip.to_i if status.success? && !out.strip.empty?
      end
    rescue StandardError => e
      Jekyll.logger.warn "nav_updates:", e.message
    end
  end
end
