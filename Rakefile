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
  desc 'Generate meeting pages from plan.yml/meetings.yml (usage: rake meetings:generate[CS-280,202610])'
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
task :build do
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
    task target do
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
    # --disable-external keeps this fast and offline; drop that flag
    # periodically (e.g. in CI on a schedule) to also check outbound links.
    sh 'bundle exec htmlproofer ./_site --disable-external --check-html'
  end

  desc 'Check both target builds (github, uregina) before deploying either'
  task html_all: 'build:all' do
    %w[github uregina].each do |target|
      sh "bundle exec htmlproofer ./_site_#{target} --disable-external --check-html"
    end
  end

  desc 'Run unit tests against plugin logic directly (no Jekyll build needed)'
  task :unit do
    sh 'bundle exec ruby -Ilib -Itest test/meeting_grid_test.rb'
  end
end
