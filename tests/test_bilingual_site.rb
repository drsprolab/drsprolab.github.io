require 'minitest/autorun'
require 'nokogiri'
require 'json'
require 'yaml'

class BilingualSiteTest < Minitest::Test
  ROOT = File.expand_path('..', __dir__)
  SITE = File.join(ROOT, '_site-en-preview')
  def html(route)
    relative = route.delete_prefix('/')
    relative = File.join(relative, 'index.html') unless relative.end_with?('.html')
    Nokogiri::HTML5(File.read(File.join(SITE, relative)))
  end
  def routes
    JSON.parse(html('/').at_css('#language-routing').text)
  end

  def test_counterparts_are_complete_and_language_metadata_is_consistent
    assert_equal 57, routes.length
    routes.each do |ko,en|
      original=html(ko); translated=html(en)
      assert_equal 'en', translated.at_css('html')['lang'], en
      assert_equal 'ko', original.at_css('html')['lang'], ko
      assert translated.at_css('meta[name="robots"]')['content'].include?('noindex')
      assert_equal "http://127.0.0.1:4012#{en}", translated.at_css('link[rel="canonical"]')['href']
      assert_equal "http://127.0.0.1:4012#{ko}", translated.at_css('link[hreflang="ko"]')['href']
      assert_equal ko, translated.at_css('[data-language-choice="ko"]')['href']
      assert_equal en, original.at_css('[data-language-choice="en"]')['href']
      unless ko == '/blog/'
        assert_equal original.css('main .page-banner img').map{|i|i['src']}, translated.css('main .page-banner img').map{|i|i['src']}, en
      end
      assert_equal '', translated.at_css('body')['data-hit-api']
    end
  end

  def test_excluded_and_unpublished_pages_have_no_english_copies
    refute routes.keys.any?{|r|r.match?(%r{\A/(research-help|in-progress)/}) || (r.start_with?('/blog/') && r != '/blog/')}
    refute routes.keys.any?{|r|r.include?('2026-10-26-ai-metacognitive')}
    %w[research-help in-progress].each{|p|refute Dir.exist?(File.join(SITE,'en',p))}
    assert Dir.exist?(File.join(SITE,'en','blog'))
  end

  def test_measurement_listing_is_english_with_english_thumbnails
    page=html('/en/blog/')
    assert_equal 10,page.css('.inst-grid .inst').size
    refute_match(/[가-힣]/,page.css('.inst-grid').text)
    assert_equal 10,page.css('.inst-thumb[src^="/assets/og/measurement-en/"]').size
    page.css('.inst-thumb').each do |image|
      assert File.file?(File.join(SITE,image['src'].delete_prefix('/'))), image['src']
    end
    assert_equal 'Measurement & Solution',page.at_css('.site-nav > ul > li > a[href="/en/blog/"]').text.strip
    assert page.css('.submenu .language-only').any?{|label| label.text.include?('Korean only')}
  end

  def test_all_published_insights_have_english_text_and_original_references
    index=html('/en/weekly-insight/'); lab=html('/en/weekly-insight/lab/')
    cards=index.css('.daily-archive .inst')+lab.css('.daily-archive .inst')
    assert_equal 22,cards.size
    cards.each do |card|
      assert card['href'].start_with?('/en/weekly-insight/'),card['href']
      refute_match(/[가-힣]/, card.at_css('h3').text)
      translated=html(card['href']); original=html(card['href'].delete_prefix('/en'))
      assert_equal original.css('.references p').size, translated.css('.references p').size
      assert_equal original.css('.daily-content h2[id]').map{|n|n['id']}, translated.css('.daily-content h2[id]').map{|n|n['id']}
      assert_operator translated.css('.daily-content p').size,:>=,10
      expected=original.css('.references').text.scan(%r{https://doi\.org/[^\s<>]+})
      expected.each{|doi|assert_includes translated.css('.references').text,doi}
      prose=translated.at_css('.daily-content').dup
      prose.css('.references').remove # preserve source-language bibliographic records
      refute_match(/[가-힣]/,prose.text)
    end
  end

  def test_original_numbers_people_and_publications_are_preserved
    %w[members research research/lab project institutes].each do |path|
      original=html("/#{path}/"); translated=html("/en/#{path}/")
      %w[.member .pubs>li .gcard .num].each do |selector|
        assert_equal original.css(selector).size,translated.css(selector).size,"#{path}:#{selector}"
      end
      assert_equal original.css('.num').map{|n|n.text.scan(/\d+/)},translated.css('.num').map{|n|n.text.scan(/\d+/)}
    end
  end

  def test_translation_dictionary_has_no_duplicate_keys
    keys=Psych.parse_file(File.join(ROOT,'_data/english/text.yml')).root.children.each_slice(2).map{|k,_|k.value}
    assert_equal keys.uniq,keys
  end
end
