# frozen_string_literal: true

require 'psych'

# Finds duplicate mapping keys in YAML files.  YAML parsers silently keep the
# last value, so a repeated `changes:` block quietly discards the first one.
# Works on Psych's node tree (not the loaded Hash), so it sees every level and
# reports line numbers.  Merge keys (`<<`) may legitimately repeat and are skipped.
module YamlDuplicateKeys
  Duplicate = Struct.new(:file, :path, :key, :lines) do
    def to_s
      where = path.empty? ? 'top level' : path.join(' > ')
      "#{file}: duplicate key `#{key}` at #{where} (lines #{lines.join(', ')})"
    end
  end

  def self.check_file(path)
    check_string(File.read(path), path)
  end

  def self.check_string(yaml, file = '(string)')
    found = []
    Psych.parse_stream(yaml, filename: file).children.each do |doc|
      walk(doc.root, [], file, found) if doc.root
    end
    found
  end

  def self.check_files(paths)
    paths.flat_map { |p| check_file(p) }
  end

  def self.walk(node, trail, file, found)
    case node
    when Psych::Nodes::Mapping
      seen = Hash.new { |h, k| h[k] = [] }
      node.children.each_slice(2) do |key, value|
        name = key.is_a?(Psych::Nodes::Scalar) ? key.value : '?'
        seen[name] << key.start_line + 1 unless name == '<<'
        walk(value, trail + [name], file, found)
      end
      seen.each do |name, lines|
        found << Duplicate.new(file, trail, name, lines) if lines.size > 1
      end
    when Psych::Nodes::Sequence
      node.children.each_with_index { |child, i| walk(child, trail + ["[#{i}]"], file, found) }
    end
  end
  private_class_method :walk
end