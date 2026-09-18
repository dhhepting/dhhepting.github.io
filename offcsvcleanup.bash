echo "Classes_taught entries:"
   grep -rn '+' _data/teaching/all/semesters.yml            # classes_taught entries
echo "Inline conversions:"
   grep -rn 'tr("+"' _plugins lib | grep -v _site           # inline conversions
echo "CSV readers:"
   grep -rln 'teaching\.all\.offerings' _includes _layouts  # CSV readers
echo "Semester readers:"
   grep -rln 'teaching\.all\.semesters' _includes _layouts  # CSV readers
