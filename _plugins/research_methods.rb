# frozen_string_literal: true
# One data source feeds the catalog, recommendation rules and readable detail pages.
module ResearchMethods
  class Generator < Jekyll::Generator
    safe true
    priority :normal
    def generate(site)
      data = site.data.fetch('research_methods')
      data.fetch('methods').each do |method|
        path = "research-help/methods/#{method.fetch('id')}"
        page = Jekyll::PageWithoutAFile.new(site, site.source, path, 'index.html')
        page.content = ''
        page.data.merge!('layout' => 'research-method', 'title' => method.fetch('name'),
                         'lede' => method.fetch('question'), 'wide' => true, 'research_methods' => true,
                         'research_method' => method)
        site.pages << page
      end
    end
  end
end
