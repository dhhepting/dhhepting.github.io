# frozen_string_literal: true
#
# Rakefile
#
# `rake` (no args) runs everything, cheapest checks first:
#   1. rake data:validate  — fast, no Jekyll build. Checks _data/teaching
#      shape directly (catches things like the missing `mdays` bug in
#      under a second).
#   2. rake build          — `jekyll build --trace`, fails loudly on any
#      Liquid/Ruby error, including ones our plugin now raises on
#      purpose (see _plugins/meeting_grid.rb).
#   3. rake test:html      — runs html-proofer against the built _site/,
#      catching broken internal links and mismatched anchor IDs (like
#      the ssTopics/ssTLO_* mismatch we noticed in main.html).
#
# Run just one tier while iterating, e.g.: `rake data:validate`

require 'yaml'

task default: %i[data:validate wiki:validate build test:html]

namespace :meetings do
  desc 'Create new hand-authored meeting-page stubs for any meeting missing one (usage: rake meetings:generate[CS-280,202610]). Generated fields like weekday/links are computed automatically at build time — this only creates files, review + commit the result.'
  task :generate, %i[crs_id crs_sem] do |_t, args|
    require_relative 'lib/meeting_page_generator'

    force = ENV['FORCE'] == '1'
    result = MeetingPageGenerator.new.generate_for(args[:crs_id], args[:crs_sem], force: force)

    result[:created].each { |c| puts "created: #{c}" }
    result[:skipped].each { |s| puts "skipped: #{s}" }
    result[:errors].each { |e| puts "ERROR: #{e}" }
    abort if result[:errors].any?
  end
end

namespace :photos do
  desc 'Regenerate all meeting photo pages from media.csv across every offering. Always safe to run — these pages have no hand-authored content, so nothing is ever preserved or skipped.'
  task :sync_all do
    require_relative 'lib/meeting_photos_page_generator'

    result = MeetingPhotosPageGenerator.new.generate_all
    result[:written].each { |w| puts "wrote: #{w}" }
    result[:errors].each { |e| puts "ERROR: #{e}" }
    abort if result[:errors].any?
  end
end

namespace :data do
  desc 'Validate _data/teaching structure for every offering'
  task :validate do
    require_relative 'lib/teaching_data_validator'

    errors = TeachingDataValidator.new('_data/teaching').run
    if errors.empty?
      puts 'Data validation passed.'
    else
      puts "Data validation FAILED (#{errors.size} problem#{'s' if errors.size != 1}):"
      errors.each { |e| puts "  - #{e}" }
      abort
    end
  end
end

namespace :wiki do
  desc 'Validate every .creole wiki-seed file parses cleanly and has required front matter'
  task :validate do
    require_relative 'lib/wiki_start_validator'

    errors = WikiStartValidator.new('_wiki_starts').run
    if errors.empty?
      puts 'Wiki-seed validation passed.'
    else
      puts "Wiki-seed validation FAILED (#{errors.size} problem#{'s' if errors.size != 1}):"
      errors.each { |e| puts "  - #{e}" }
      abort
    end
  end

  desc 'Generate wiki-start .creole pages from a plan.yml (usage: rake wiki:generate[CS-428+828,202610])'
  task :generate, %i[crs_id crs_sem] do |_t, args|
    require_relative 'lib/wiki_start_generator'

    force = ENV['FORCE'] == '1'
    result = WikiStartGenerator.new.generate_for(args[:crs_id], args[:crs_sem], force: force)

    result[:written].each { |w| puts "wrote: #{w}" }
    result[:skipped].each { |s| puts "skipped: #{s}" }
    result[:errors].each { |e| puts "ERROR: #{e}" }
    abort if result[:errors].any?
  end
end

desc 'Build the Jekyll site, failing loudly on any Liquid/Ruby error'
task build: 'photos:sync_all' do
  # Cleans _site/ and .jekyll-cache/ first — without this, output from a
  # different command (e.g. `urserve`'s `jekyll serve`, which can bake in
  # a completely different site.url depending on Jekyll version) could
  # linger untouched by this build and get checked/deployed as if it were
  # current. This is what let localhost:4000 URLs end up in checked HTML
  # despite no template anywhere containing that string.
  sh 'bundle exec jekyll clean'
  sh 'bundle exec jekyll build --trace'
end

# Dual-hosted build: dhhepting.github.io and www2.cs.uregina.ca differ in
# url/baseurl, so each needs its own build into its own destination — one
# build's output can't just be copied to the other host, since baseurl is
# baked into every generated link at build time.
#
# Confirmed against the real `urserve` dev script: Jekyll's native
# `--config a,b` merges config files left-to-right (later overrides
# earlier) — no separate preprocessing script involved. _config_uregina.yml
# already exists per urserve; _config_github.yml needs to exist alongside
# it with the equivalent github.io values (url/baseurl at minimum).
namespace :build do
  %w[github uregina].each do |target|
    desc "Build the site for the #{target} deploy target"
    task target => 'photos:sync_all' do
      sh "bundle exec jekyll clean --destination _site_#{target}"
      sh "bundle exec jekyll build --trace " \
         "--config _config.yml,_config_#{target}.yml " \
         "--destination _site_#{target}"
    end
  end

  desc 'Build both deploy targets (github and uregina)'
  task all: %w[github uregina]
end

namespace :test do
  desc 'Check rendered _site/ for broken internal links and mismatched anchors'
  task html: :build do
    # baseurl: matches the root _config.yml's `baseurl: /~hepting`
    run_htmlproofer('./_site', baseurl: '/~hepting')
  end

  desc 'Check both target builds (github, uregina) before deploying either'
  task html_all: 'build:all' do
    run_htmlproofer('./_site_github', baseurl: '')
    run_htmlproofer('./_site_uregina', baseurl: '/~hepting')
  end

  # Calls html-proofer's Ruby API directly rather than shelling out to the
  # `htmlproofer` CLI binary. This exists because the CLI's flag names have
  # changed across versions in ways that were hard to predict from docs
  # (--check-html and --config-file both turned out invalid for the
  # installed 5.2.1) — the options-hash Ruby API is what the README
  # documents in detail and is more stable to depend on.
  #
  # _htmlproofer.yml's keys are loaded as symbols to match that API.
  # ignore_urls entries get compiled to real Regexp objects — the CLI's
  # config loader may have handled string-vs-regex differently, but since
  # --config-file never actually worked, there's no prior behavior here to
  # preserve; compiling everything as a Regexp is correct for both the
  # plain-string entries (mailto:, tel:) and the anchored patterns, since
  # none of the plain ones contain characters that change meaning as regex.
  def run_htmlproofer(dir, baseurl: '')
    require 'html-proofer'
    require 'yaml'

    options = (YAML.load_file('_htmlproofer.yml') || {}).transform_keys(&:to_sym)
    options[:ignore_urls] = (options[:ignore_urls] || []).map { |p| Regexp.new(p) }

    # Without this, html-proofer checks whether internal links literally
    # exist at paths like _site/~hepting/teaching/index.html — which never
    # exist, since ~hepting isn't a real directory, it's a URL prefix
    # Jekyll adds from `baseurl`. This was responsible for ~92% of the
    # 25,555 failures on the first real run (23,576 of them) — not actual
    # broken links, just unresolved baseurl prefixes.
    unless baseurl.to_s.empty?
      options[:swap_urls] = { /^#{Regexp.escape(baseurl)}\// => '/' }
    end

    proofer = HTMLProofer.check_directory(dir, options)
    proofer.run

    return if proofer.failed_checks.empty?

    puts "html-proofer found #{proofer.failed_checks.size} problem(s) in #{dir}:"
    proofer.failed_checks.each { |f| puts "  #{f.path}: #{f.description}" }
    abort
  end

  desc 'Run unit tests against plugin logic directly (no Jekyll build needed)'
  task :unit do
    sh 'bundle exec ruby -Ilib -Itest test/meeting_grid_test.rb'
  end
end
