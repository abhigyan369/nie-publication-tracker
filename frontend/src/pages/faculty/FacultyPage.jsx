import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Users, BookOpen, TrendingUp } from 'lucide-react'

function FacultyPage() {
  // Placeholder data
  const faculty = [
    { id: '1', name: 'Dr. Sarah Chen', department: 'Computer Science', publications: 15, citations: 234 },
    { id: '2', name: 'Prof. Michael Brown', department: 'Electronics', publications: 23, citations: 567 },
    { id: '3', name: 'Dr. Priya Sharma', department: 'Mechanical', publications: 12, citations: 189 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Faculty</h2>
        <p className="text-muted-foreground">View faculty publication statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculty.length}</p>
                <p className="text-sm text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {faculty.reduce((sum, f) => sum + f.publications, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Publications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {faculty.reduce((sum, f) => sum + f.citations, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Citations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faculty Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faculty.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium">{member.publications}</p>
                    <p className="text-xs text-muted-foreground">Publications</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{member.citations}</p>
                    <p className="text-xs text-muted-foreground">Citations</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FacultyPage
