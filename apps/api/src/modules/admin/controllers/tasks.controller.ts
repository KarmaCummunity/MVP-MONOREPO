import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, AdminAuthGuard } from "../../auth/jwt-auth.guard";
import {
  CreateTaskDto,
  LogTaskHoursDto,
  TaskStatus,
  TaskPriority,
  UpdateTaskDto,
} from "../dto/tasks.dto";
import { TasksService } from "../services/tasks.service";

@Controller("/api/tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listTasks(
    @Query("status") status?: TaskStatus,
    @Query("priority") priority?: TaskPriority,
    @Query("category") category?: string,
    @Query("assignee") assignee?: string,
    @Query("q") searchQuery?: string,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    return this.tasksService.listTasks({
      status,
      priority,
      category,
      assignee,
      searchQuery,
      limitParam,
      offsetParam,
    });
  }

  @Get("init-table")
  @UseGuards(AdminAuthGuard)
  async initTasksTable() {
    return this.tasksService.initTasksTable();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getTask(@Param("id") id: string) {
    return this.tasksService.getTask(id);
  }

  @Get(":id/subtasks")
  @UseGuards(JwtAuthGuard)
  async getSubtasks(@Param("id") parentId: string) {
    return this.tasksService.getSubtasks(parentId);
  }

  @Get(":id/tree")
  @UseGuards(JwtAuthGuard)
  async getTaskTree(@Param("id") rootId: string) {
    return this.tasksService.getTaskTree(rootId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async createTask(@Body() body: CreateTaskDto) {
    return this.tasksService.createTask(body);
  }

  @Post(":id/log-hours")
  @UseGuards(JwtAuthGuard)
  async logTaskHours(
    @Param("id") taskId: string,
    @Body() body: LogTaskHoursDto,
  ) {
    return this.tasksService.logTaskHours(taskId, body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async updateTask(@Param("id") id: string, @Body() body: UpdateTaskDto) {
    return this.tasksService.updateTask(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteTask(@Param("id") id: string) {
    return this.tasksService.deleteTask(id);
  }

  @Get("hours-report/:managerId")
  @UseGuards(JwtAuthGuard)
  async getHoursReport(@Param("managerId") managerId: string) {
    return this.tasksService.getHoursReport(managerId);
  }
}
