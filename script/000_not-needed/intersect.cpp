#include <iostream>
using namespace std;
#include <math.h>

int
main()
{
  float m1, c1, m2, c2;
  float x1, y1, x2, y2;
  float dx, dy;
  float intersection_X, intersection_Y;

  cout << " Program to find the intersecting point of two lines:\n";

  cout << "Enter Line1 - X1: ";
  cin >> x1;
  cout << "Enter Line1 - Y1: ";
  cin >> y1;

  cout << "Enter Line1 - X2: ";
  cin >> x2;
  cout << "Enter Line1 - Y2: ";
  cin >> y2;

  dx = x2 - x1;
  dy = y2 - y1;
  m1 = dy / dx;

  // y = mx + c
  // intercept c = y - mx

  c1 = y1 - m1 * x1; // which is same as y2 - slope * x2

  cout << "Enter Line2 - X1: ";
  cin >> x1;
  cout << "Enter Line2 - Y1: ";
  cin >> y1;

  cout << "Enter Line2 - X2: ";
  cin >> x2;
  cout << "Enter Line2 - Y2: ";
  cin >> y2;

  dx = x2 - x1;
  dy = y2 - y1;
  m2 = dy / dx;

  c2 = y2 - m2 * x2; // which is same as y2 - slope * x2

  cout << "Equation of line1: ";
  cout << m1 << "X " << ((c1 < 0) ? ' ' : '+') << c1 << "\n";
  cout << "Equation of line2: ";
  cout << m2 << "X " << ((c2 < 0) ? ' ' : '+') << c2 << "\n";

  if ((m1 - m2) == 0)
  {
    cout << "No Intersection between the lines\n";
  }
  else
  {
    intersection_X = (c2 - c1) / (m1 - m2);
    intersection_Y = m1 * intersection_X + c1;
    cout << "Intersection Point: = ";
    cout << intersection_X;
    cout << ",";
    cout << intersection_Y;
    cout << "\n";
  }
}
