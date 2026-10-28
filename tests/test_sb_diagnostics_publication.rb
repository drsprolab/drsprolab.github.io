# frozen_string_literal: true
# Build the real site: hiding cards alone must not leave direct downloads public.
require 'minitest/autorun'
require 'jekyll'
require 'tmpdir'

class SbDiagnosticsPublicationTest < Minitest::Test
  ROOT = File.expand_path('..', __dir__)

  def build(destination, published)
    site = Jekyll::Site.new(Jekyll.configuration(
      'source' => ROOT, 'destination' => destination,
      'sb_diagnostics_published' => published,
      'quiet' => true, 'disable_disk_cache' => true
    ))
    site.process
  end

  def test_withdrawal_removes_sb_pages_assets_and_links_from_the_build
    Dir.mktmpdir('sb-publication-') do |destination|
      build(destination, false)
      sb_files = Dir.glob(File.join(destination, '**', '*')).select do |path|
        path.match?(/starbucks|sb-enterprise/i)
      end
      assert_empty sb_files, 'Withdraw SB HTML, JavaScript, PDFs and sharing images, not just cards'
      index = File.read(File.join(destination, 'in-progress/index.html'))
      refute_match(/starbucks|sb-enterprise|SB 기업 AI/, index)
      %w[ai-agent-needs ai-competency teacher-ai-competency ax-readiness aix-school].each do |slug|
        assert File.file?(File.join(destination, "in-progress/#{slug}/index.html")), "Keep #{slug} published"
        assert_includes index, "/in-progress/#{slug}/"
      end
    end
  end

  def test_single_true_switch_republishes_preserved_sources_and_can_be_withdrawn_again
    sources = Dir.glob(File.join(ROOT, '{in-progress,assets}', '**', '*')).select do |path|
      File.file?(path) && path.match?(/starbucks|sb-enterprise/i)
    end
    refute_empty sources, 'Keep original sources available for re-publication'
    Dir.mktmpdir('sb-republication-') do |destination|
      build(destination, true)
      sources.each do |source|
        relative = source.delete_prefix(ROOT + '/')
        output = File.join(destination, relative)
        assert File.file?(output), "Restore #{relative}"
        assert_equal File.binread(source), File.binread(output), "Preserve #{relative} exactly"
      end
      index = File.read(File.join(destination, 'in-progress/index.html'))
      %w[store hq].each do |track|
        assert_includes index, "/in-progress/starbucks-ai-#{track}/"
      end
      # A second build must remove previously emitted files as well.
      build(destination, false)
      sources.each do |source|
        relative = source.delete_prefix(ROOT + '/')
        refute File.exist?(File.join(destination, relative)), "Clean stale #{relative}"
        assert File.file?(source), "Never delete source #{relative}"
      end
    end
  end

  def test_missing_or_quoted_switch_never_accidentally_publishes
    [nil, 'false', 'true'].each do |value|
      Dir.mktmpdir('sb-fail-closed-') do |destination|
        build(destination, value)
        refute File.exist?(File.join(destination, 'in-progress/starbucks-ai-store/index.html'))
        refute File.exist?(File.join(destination, 'in-progress/starbucks-ai-hq/index.html'))
        refute File.exist?(File.join(destination, 'assets/js/starbucks-ai.js'))
        index = File.read(File.join(destination, 'in-progress/index.html'))
        refute_match(/starbucks|sb-enterprise|SB 기업 AI/, index)
      end
    end
  end
end
