# Weekly Insight 글마다 공유용 미리보기 이미지(Open Graph, 1200×630)를 만든다.
#   ruby tools/og_images.rb            → assets/og/insights/<파일이름>.png
# 배포(GitHub Actions)에서 jekyll build 전에 실행되므로, 새 글을 올리면 이미지도 저절로 생긴다.
# 로컬에서는 CHROME 환경변수로 크롬 경로를 바꿀 수 있다(기본: macOS Chrome 또는 google-chrome).
require "yaml"
require "date"
require "cgi"
require "fileutils"
require "tmpdir"

ROOT = File.expand_path("..", __dir__)
OUT = File.join(ROOT, "assets/og/insights")
CHROME = ENV["CHROME"] || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "google-chrome", "google-chrome-stable", "chromium"
].find { |c| c.include?("/") ? File.exist?(c) : system("command -v #{c} >/dev/null 2>&1") }
abort "og_images: Chrome을 찾지 못했습니다 (CHROME 환경변수로 지정)" unless CHROME

def front_matter(path)
  text = File.read(path, encoding: "utf-8")
  m = text.match(/\A---\s*\n(.*?)\n---/m)
  m ? YAML.safe_load(m[1], permitted_classes: [Date, Time]) || {} : {}
end

def b64(path)
  ["data:image/", File.extname(path).delete(".").sub("jpg", "jpeg"), ";base64,", [File.binread(path)].pack("m0")].join
end

BANNER = b64(File.join(ROOT, "assets/images/banners/daily-insight.jpg"))
LOGO = b64(File.join(ROOT, "assets/images/hyu-symbol.png"))

def html(fm)
  title = CGI.escapeHTML(fm["title"].to_s)
  date = (fm["date"].respond_to?(:strftime) ? fm["date"] : DateTime.parse(fm["date"].to_s)).strftime("%Y.%m.%d")
  topics = Array(fm["topics"]).first(4).map { |t| %(<span class="chip">#{CGI.escapeHTML(t.to_s)}</span>) }.join
  size = title.length > 46 ? 50 : title.length > 30 ? 58 : 66
  <<~HTML
    <!doctype html><html lang="ko"><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;600;700&family=IBM+Plex+Mono:wght@500&display=block">
    <style>
      * { box-sizing: border-box; margin: 0; }
      body { width: 1200px; height: 630px; overflow: hidden; font-family: "IBM Plex Sans KR", "Noto Sans CJK KR", "Apple SD Gothic Neo", sans-serif; color: #eef4ff;
        background: #0b1a33 url('#{BANNER}') center / cover; }
      .shade { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(7,16,32,.94) 0%, rgba(7,16,32,.86) 55%, rgba(7,16,32,.55) 100%); }
      .card { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
      .eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 22px; letter-spacing: .14em; color: #8fc3ff; text-transform: uppercase; }
      h1 { margin-top: 26px; font-weight: 700; font-size: #{size}px; line-height: 1.28; letter-spacing: -.02em; max-width: 1000px;
        display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: keep-all; }
      .chips { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px; }
      .chip { font-size: 22px; font-weight: 500; padding: 6px 16px; border-radius: 999px; background: rgba(143,195,255,.16); border: 1px solid rgba(143,195,255,.35); color: #d6e6fb; }
      .foot { margin-top: auto; display: flex; align-items: center; gap: 16px; }
      .foot img { width: 52px; height: 52px; }
      .foot b { display: block; font-size: 26px; font-weight: 700; }
      .foot span { font-family: "IBM Plex Mono", monospace; font-size: 17px; letter-spacing: .12em; color: #a9bddb; }
      .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: #2f80ed; }
    </style></head><body>
      <div class="shade"></div><div class="bar"></div>
      <div class="card">
        <div class="eyebrow">Weekly Insight · #{date}</div>
        <h1>#{title}</h1>
        <div class="chips">#{topics}</div>
        <div class="foot"><img src="#{LOGO}" alt=""><div><b>PRO-AX Lab</b><span>HANYANG UNIVERSITY</span></div></div>
      </div>
    </body></html>
  HTML
end

FileUtils.mkdir_p(OUT)
made = 0
Dir.mktmpdir do |tmp|
  Dir[File.join(ROOT, "_insights/*.md")].sort.each do |md|
    fm = front_matter(md)
    next if fm["title"].to_s.empty?
    name = File.basename(md, ".md")
    png = File.join(OUT, "#{name}.png")
    next if File.exist?(png) && File.mtime(png) > File.mtime(md) && ENV["OG_FORCE"].nil?
    page = File.join(tmp, "#{name}.html")
    File.write(page, html(fm))
    ok = system(CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
                "--window-size=1200,630", "--virtual-time-budget=5000", "--screenshot=#{png}", "file://#{page}",
                out: File::NULL, err: File::NULL)
    if ok && File.exist?(png) then made += 1 else warn "og_images: #{name} 실패" end
  end
end
puts "og_images: #{made}개 생성 → assets/og/insights/"
