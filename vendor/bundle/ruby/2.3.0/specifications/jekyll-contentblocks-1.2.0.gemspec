# -*- encoding: utf-8 -*-
# stub: jekyll-contentblocks 1.2.0 ruby lib

Gem::Specification.new do |s|
  s.name = "jekyll-contentblocks".freeze
  s.version = "1.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Rusty Geldmacher".freeze]
  s.date = "2016-02-25"
  s.description = "Provides a mechanism for passing content up to the layout, like Rails' content_for".freeze
  s.email = ["russell.geldmacher@gmail.com".freeze]
  s.homepage = "https://github.com/rustygeldmacher/jekyll-contentblocks".freeze
  s.rubygems_version = "2.5.2".freeze
  s.summary = "A Jekyll plugin kind of like Rails' content_for".freeze

  s.installed_by_version = "2.5.2" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<jekyll>.freeze, [">= 0"])
    else
      s.add_dependency(%q<jekyll>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<jekyll>.freeze, [">= 0"])
  end
end
