# Weekly Insight 글의 Open Graph 이미지를 jekyll-seo-tag 에 넘긴다 (page.image).
# 이미지는 tools/og_images.rb 가 assets/og/insights/<파일이름>.png 로 만든다. 없으면 Weekly Insight 배너로 대신한다.
module OgImage
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      coll = site.collections["insights"]
      return unless coll
      coll.docs.each do |doc|
        next if doc.data["image"]
        name = File.basename(doc.path, File.extname(doc.path))
        rel = "/assets/og/insights/#{name}.png"
        doc.data["image"] =
          if File.exist?(File.join(site.source, rel))
            { "path" => rel, "width" => 1200, "height" => 630, "alt" => doc.data["title"].to_s }
          else
            { "path" => "/assets/images/banners/daily-insight.jpg", "width" => 1536, "height" => 320, "alt" => "Weekly Insight" }
          end
      end
    end
  end
end
