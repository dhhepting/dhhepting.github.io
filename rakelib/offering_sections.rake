# rakelib/offering_sections.rake
require 'yaml'
require 'date'

PARAM_TO_KEY = {
  'mtgs' => 'mtgs', 'wkly' => 'weekly', 'sched' => 'office_hours',
  'code' => 'code', 'links' => 'links', 'topics' => 'topics',
  'asgns' => 'assignments', 'exams' => 'exams', 'feedback' => 'feedback'
}.freeze

def to_bool(v)
  case v
  when '0', 'false' then false
  when '1', 'true'  then true
  end
end

namespace :test do
  desc 'Compare offering.yml sections with include params (only for offerings that have an offering.yml)'
  task :offering_sections do
    errors  = []
    warns   = []
    skipped = []
    checked = 0

    Dir['teaching/*/*/index.md'].sort.each do |page|
      _, course, sem = page.split('/')

      # No offering.yml => nothing to compare against, so skip entirely.
      data = "_data/teaching/#{course.tr('+', '_')}/#{sem}/offering.yml"
      unless File.exist?(data)
        skipped << page
        next
      end

      text = File.read(page)
      inc  = text[/\{%-?\s*include\s+offering\/main\.html(.*?)-?%\}/m, 1]
      next unless inc
      checked += 1

      front = text[/\A---\n(.*?)\n---/m, 1]
      fm = front ? (YAML.safe_load(front, permitted_classes: [Date, Time], aliases: true) rescue {}) : {}

      if fm['sem'] && fm['sem'].to_s != sem
        errors << "#{page}: front matter sem=#{fm['sem']} but directory is #{sem}"
      end

      offering = YAML.load_file(data) || {}
      sections = offering['sections'] || {}

      unknown = sections.keys - PARAM_TO_KEY.values
      errors << "#{data}: unknown sections keys #{unknown.inspect}" unless unknown.empty?

      params = inc.scan(/(\w+)\s*=\s*(\S+)/).to_h
      unknown_params = params.keys - PARAM_TO_KEY.keys - %w[title]
      errors << "#{page}: unknown include params #{unknown_params.inspect}" unless unknown_params.empty?

      PARAM_TO_KEY.each do |param, key|
        next unless params.key?(param)
        pv = to_bool(params[param])
        ov = sections[key]
        if pv.nil?
          errors << "#{page}: #{param}=#{params[param]} is not 0/1/true/false"
        elsif ov.nil?
          warns << "#{page}: #{param}=#{params[param]} but #{data} has no sections.#{key}"
        elsif pv != ov
          errors << "#{page}: #{param}=#{params[param]} overrides #{data} #{key}: #{ov}"
        else
          warns << "#{page}: #{param}=#{params[param]} is redundant with #{data}"
        end
      end
    end

    skipped.each { |s| puts "SKIP  #{s} (no offering.yml)" }
    warns.each   { |w| puts "WARN  #{w}" }
    errors.each  { |e| puts "ERROR #{e}" }
    abort "#{errors.size} offering section problem(s)" unless errors.empty?
    puts "offering_sections: OK (#{checked} checked, #{skipped.size} skipped, #{warns.size} warning(s))"
  end
end
