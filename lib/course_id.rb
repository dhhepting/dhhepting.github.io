# frozen_string_literal: true

# lib/course_id.rb
# The ONE place course-id encodings are converted. A cross-listed course has a
# readable "+" form (CS-428+828) and a data/dir-safe "_" form (CS-428_828).
#
# CONVERSION IS ONE-WAY ONLY: "+" -> "_". The reverse is intentionally absent,
# because "_" -> "+" is ambiguous (an underscore could be original, not a former
# plus). Anything user-facing must read the canonical "+" id from where it is
# authored (offering.yml `id:`), never reconstruct it from a data key.
module CourseId
  module_function

  # Canonical data-tree / directory key for a course id (or dir name).
  # Idempotent: data_key("CS-428_828") == data_key("CS-428+828") == "CS-428_828".
  def data_key(id)
    id.to_s.tr('+', '_')
  end
end