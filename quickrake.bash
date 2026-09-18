
grep -rn "SemesterData::Generator" Rakefile lib/     # the call site(s)
grep -rn "module SemesterData"      lib/             # where the module opens
grep -rn "class .*\b\(Generator\|Validator\)\b" lib/ # what the class is actually named
