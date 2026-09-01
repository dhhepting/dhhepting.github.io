# frozen_string_literal: true
require_relative "../lib/tlo_validator"
dir = ARGV[0] || "_data/teaching"
errs = TLOValidator.new(dir).run
if errs.empty?
  puts "OK - 0 errors"
else
  puts "#{errs.size} error(s):"
  errs.each { |e| puts "  - #{e}" }
end
exit(errs.empty? ? 0 : 1)