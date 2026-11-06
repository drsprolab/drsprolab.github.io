# frozen_string_literal: true
# 논문 목록(_data/publications.yml)의 '원문' 링크. 항목에 url 이 있으면 그것을 쓰고,
# 없으면 citation 안의 DOI 주소(https://doi.org/…, doi.org/…, dx.doi.org/…)를 찾아 원문 저널 링크로 만든다.
# 둘 다 없는 논문(DOI가 확인되지 않은 것)은 원문 배지를 달지 않는다.
module PublicationLinks
  DOI = %r{(?:https?://)?(?:dx\.)?doi\.org/\s?(10\.\d{4,9}/\S+)}i.freeze

  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      Array(site.data["publications"]).each do |pub|
        next if pub["url"].to_s.strip != ""
        m = DOI.match(pub["citation"].to_s)
        next unless m
        doi = m[1].sub(/[.,;)\]]+\z/, "")
        pub["url"] = "https://doi.org/#{doi}"
      end
    end
  end
end
