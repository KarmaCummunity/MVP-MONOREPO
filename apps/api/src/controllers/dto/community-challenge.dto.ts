// DTOs for Community Group Challenges
// Validation using class-validator decorators
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsBoolean,
  IsIn,
} from "class-validator";
import { Transform, Type } from "class-transformer";

// Challenge types
export enum ChallengeType {
  BOOLEAN = "BOOLEAN",
  NUMERIC = "NUMERIC",
  DURATION = "DURATION",
}

export enum ChallengeFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  FLEXIBLE = "FLEXIBLE",
}

export enum ChallengeDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

export enum GoalDirection {
  MAXIMIZE = "maximize",
  MINIMIZE = "minimize",
}

// DTO for creating a new community challenge
export class CreateCommunityGroupChallengeDto {
  @IsOptional()
  @IsString()
  creator_id?: string;

  @IsString()
  @MinLength(3, { message: "כותרת האתגר חייבת להכיל לפחות 3 תווים" })
  @MaxLength(255, { message: "כותרת האתגר לא יכולה להכיל יותר מ-255 תווים" })
  title = "";

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "תיאור האתגר לא יכול להכיל יותר מ-2000 תווים" })
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsEnum(ChallengeType, {
    message: "סוג האתגר חייב להיות BOOLEAN, NUMERIC או DURATION",
  })
  type: ChallengeType = ChallengeType.BOOLEAN;

  @IsEnum(ChallengeFrequency, {
    message: "תדירות האתגר חייבת להיות DAILY, WEEKLY או FLEXIBLE",
  })
  frequency: ChallengeFrequency = ChallengeFrequency.DAILY;

  @IsOptional()
  @IsNumber({}, { message: "ערך היעד חייב להיות מספר" })
  @Min(0, { message: "ערך היעד לא יכול להיות שלילי" })
  goal_value?: number;

  @IsOptional()
  @IsDateString({}, { message: "תאריך היעד חייב להיות בפורמט תקין" })
  deadline?: string;

  @IsOptional()
  @IsEnum(ChallengeDifficulty, {
    message: "רמת הקושי חייבת להיות easy, medium, hard או expert",
  })
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "שם הקטגוריה לא יכול להכיל יותר מ-50 תווים" })
  category?: string;

  @IsOptional()
  @IsEnum(GoalDirection, {
    message: "כיוון היעד חייב להיות maximize או minimize",
  })
  goal_direction?: GoalDirection;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  is_public?: boolean;
}

// DTO for updating a community challenge
export class UpdateCommunityGroupChallengeDto {
  @IsOptional()
  @IsString()
  creator_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @IsOptional()
  @IsEnum(ChallengeFrequency)
  frequency?: ChallengeFrequency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  goal_value?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsEnum(GoalDirection)
  goal_direction?: GoalDirection;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  is_public?: boolean;
}

// DTO for joining a challenge
export class JoinChallengeDto {
  @IsUUID()
  user_id = "";
}

// DTO for creating a challenge entry
export class CreateChallengeEntryDto {
  @IsUUID()
  challenge_id = "";

  @IsUUID()
  user_id = "";

  @IsOptional()
  @IsDateString()
  entry_date?: string; // If not provided, defaults to today

  @IsNumber({}, { message: "ערך הביצוע חייב להיות מספר" })
  @Min(0, { message: "ערך הביצוע לא יכול להיות שלילי" })
  value = 0;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "הערות לא יכולות להכיל יותר מ-500 תווים" })
  notes?: string;
}

// DTO for filtering challenges
export class GetChallengesFilterDto {
  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @IsOptional()
  @IsEnum(ChallengeFrequency)
  frequency?: ChallengeFrequency;

  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  creator_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  search?: string; // Search in title and description

  @IsOptional()
  @IsIn(
    [
      "created_at",
      "updated_at",
      "title",
      "type",
      "frequency",
      "difficulty",
      "category",
      "is_active",
      "participants_count",
      "deadline",
    ],
    {
      message:
        "sort_by must be one of: created_at, updated_at, title, type, frequency, difficulty, category, is_active, participants_count, deadline",
    },
  )
  sort_by?: string;

  @IsOptional()
  @IsIn(["ASC", "DESC"], {
    message: "sort_order must be ASC or DESC",
  })
  sort_order?: "ASC" | "DESC";
}
