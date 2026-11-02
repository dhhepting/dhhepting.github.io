# frozen_string_literal: true

require 'minitest/autorun'
require 'yaml_duplicate_keys'

class YamlDuplicateKeysTest < Minitest::Test
  def check(yaml) = YamlDuplicateKeys.check_string(yaml, 'x.yml')

  def test_clean_file_has_no_duplicates
    assert_empty check("a: 1\nb:\n  c: 2\n  d: 3\n")
  end

  def test_top_level_duplicate_with_line_numbers
    dups = check("changes:\n  a: 1\nother: 2\nchanges:\n  b: 2\n")
    assert_equal 1, dups.size
    assert_equal 'changes', dups.first.key
    assert_equal [1, 4], dups.first.lines
    assert_equal [], dups.first.path
  end

  def test_nested_duplicate_reports_path
    dups = check("changes:\n  feeds:\n    - path: a\n      path: b\n")
    assert_equal ['changes', 'feeds', '[0]'], dups.first.path
    assert_equal 'path', dups.first.key
  end

  def test_same_key_in_different_mappings_is_fine
    assert_empty check("a:\n  x: 1\nb:\n  x: 2\n")
  end

  def test_merge_keys_may_repeat
    yaml = "base: &b {x: 1}\nother: &o {y: 2}\nm:\n  <<: *b\n  <<: *o\n"
    assert_empty check(yaml)
  end

  def test_on_key_is_not_coerced
    assert_equal 1, check("on: 1\non: 2\n").size
  end

  def test_to_s_is_readable
    assert_match(/x\.yml: duplicate key `a` at top level \(lines 1, 2\)/, check("a: 1\na: 2\n").first.to_s)
  end
end