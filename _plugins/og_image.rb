# Weekly Insight 글, Measurement(측정도구) 글, In progress 진단 페이지의 Open Graph 이미지를 jekyll-seo-tag 에 넘긴다 (page.image).
# 이미지는 tools/og_images.rb 가 assets/og/insights/, assets/og/measurement/, assets/og/in-progress/ 에 만든다.
# 같은 page.image.path 가 목록 페이지 썸네일(.inst-thumb)로도 쓰인다.
module OgImage
  SITE_DEFAULT = "/assets/images/og-share-20261021.jpg"
  SHARE_ATTRIBUTION = "출처: 한양대학교 교육공학과 송지훈 교수 연구실 PRO-AnalytiX Lab."

  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      # 모든 페이지 공유 미리보기 설명의 첫 문장에 출처를 붙인다.
      (site.pages + site.posts.docs + site.collections.values.flat_map(&:docs)).each do |item|
        data = item.data
        description = data["description"] || data["summary"] || data["excerpt"] || site.config["description"]
        description = description.to_s.gsub(/<[^>]*>/, " ").gsub(/\s+/, " ").strip
        next if description.empty? || description.start_with?(SHARE_ATTRIBUTION)
        data["description"] = "#{SHARE_ATTRIBUTION} #{description}"
      end

      # Weekly Insight: 이미지가 없으면 배너로 대신한다.
      if (coll = site.collections["insights"])
        coll.docs.each do |doc|
          next if doc.data["image"]
          rel = "/assets/og/insights/#{basename(doc)}.png"
          doc.data["image"] =
            if File.exist?(File.join(site.source, rel))
              { "path" => rel, "width" => 1200, "height" => 630, "alt" => doc.data["title"].to_s }
            else
              { "path" => "/assets/images/banners/daily-insight.jpg", "width" => 1536, "height" => 320, "alt" => "Weekly Insight" }
            end
        end
      end

      # Measurement: _config.yml 기본 공유 이미지만 바꾼다(글에 직접 지정한 image 는 그대로 둔다).
      site.posts.docs.each do |doc|
        next unless doc.data["category"].to_s == "측정도구"
        current = doc.data["image"]
        next if current && !(current.is_a?(Hash) && current["path"] == SITE_DEFAULT)
        rel = "/assets/og/measurement/#{basename(doc)}.png"
        next unless File.exist?(File.join(site.source, rel))
        doc.data["image"] = { "path" => rel, "width" => 1200, "height" => 630, "alt" => doc.data["title"].to_s }
      end

      # In progress 진단: in-progress/<폴더>/index.html
      site.pages.each do |page|
        m = page.path.match(%r{\Ain-progress/([^/]+)/index\.html\z}) or next
        rel = "/assets/og/in-progress/#{m[1]}.png"
        next unless File.exist?(File.join(site.source, rel))
        page.data["image"] = { "path" => rel, "width" => 1200, "height" => 630, "alt" => page.data["title"].to_s }
      end
    end

    private

    def basename(doc)
      File.basename(doc.path, File.extname(doc.path))
    end
  end
end
