import { useListTasks, useCompleteTask, getListTasksQueryKey, useDeleteTask } from "@workspace/api-client-react";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Tasks() {
  const { data: tasks, isLoading } = useListTasks();
  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();
  const queryClient = useQueryClient();

  const handleToggle = (id: number) => {
    completeMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this task?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your to-dos across all projects.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/api/tasks/export" download>
            <Button variant="outline" className="gap-2" data-testid="button-export-csv-tasks">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Button className="gap-2" data-testid="button-add-task">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9 bg-card" />
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <div className="divide-y">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : tasks?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No tasks found.
            </div>
          ) : (
            tasks?.map((task) => (
              <div key={task.id} className={`p-4 flex items-start gap-4 transition-colors hover:bg-muted/30 group ${task.status === 'done' ? 'opacity-60' : ''}`}>
                <button 
                  onClick={() => handleToggle(task.id)}
                  className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${task.status === 'done' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <Badge variant="secondary" className={`text-[10px] uppercase px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {task.companyName && <span>{task.companyName}</span>}
                    {task.contactName && <span>• {task.contactName}</span>}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
