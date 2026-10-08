export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      branch_secrets: {
        Row: {
          branch_id: string;
          qr_secret: string;
          qr_version: number;
        };
        Insert: {
          branch_id: string;
          qr_secret?: string;
          qr_version?: number;
        };
        Update: {
          branch_id?: string;
          qr_secret?: string;
          qr_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "branch_secrets_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: true;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          created_at: string;
          gym_id: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          gym_id: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          gym_id?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_branches: {
        Row: {
          branch_id: string;
          challenge_id: string;
        };
        Insert: {
          branch_id: string;
          challenge_id: string;
        };
        Update: {
          branch_id?: string;
          challenge_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_branches_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_branches_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          created_at: string;
          description: string | null;
          ends_on: string;
          gym_id: string;
          id: string;
          metric: string;
          starts_on: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          ends_on: string;
          gym_id: string;
          id?: string;
          metric?: string;
          starts_on: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          ends_on?: string;
          gym_id?: string;
          id?: string;
          metric?: string;
          starts_on?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      check_ins: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          local_date: string;
          user_id: string;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          local_date?: string;
          user_id: string;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          local_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          user_id: string;
          workout_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          user_id?: string;
          workout_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          created_at: string;
          created_by: string | null;
          equipment: string | null;
          id: string;
          muscle_groups: string[];
          name: string;
          search_name: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          equipment?: string | null;
          id?: string;
          muscle_groups?: string[];
          name: string;
          search_name?: never;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          equipment?: string | null;
          id?: string;
          muscle_groups?: string[];
          name?: string;
          search_name?: never;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      gym_staff: {
        Row: {
          created_at: string;
          gym_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          gym_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          gym_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gym_staff_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      gyms: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          created_at: string;
          user_id: string;
          workout_id: string;
        };
        Insert: {
          created_at?: string;
          user_id?: string;
          workout_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_posts: {
        Row: {
          body: string;
          branch_id: string;
          created_at: string;
          days: string[];
          id: string;
          is_open: boolean;
          time_label: string | null;
          topic: string;
          user_id: string;
        };
        Insert: {
          body: string;
          branch_id: string;
          created_at?: string;
          days?: string[];
          id?: string;
          is_open?: boolean;
          time_label?: string | null;
          topic: string;
          user_id?: string;
        };
        Update: {
          body?: string;
          branch_id?: string;
          created_at?: string;
          days?: string[];
          id?: string;
          is_open?: boolean;
          time_label?: string | null;
          topic?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_posts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_requests: {
        Row: {
          created_at: string;
          message: string | null;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          message?: string | null;
          post_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          message?: string | null;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_requests_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "partner_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_records: {
        Row: {
          achieved_at: string;
          best_e1rm: number;
          best_weight: number;
          best_weight_reps: number;
          exercise_id: string;
          user_id: string;
          workout_id: string | null;
        };
        Insert: {
          achieved_at?: string;
          best_e1rm: number;
          best_weight: number;
          best_weight_reps: number;
          exercise_id: string;
          user_id: string;
          workout_id?: string | null;
        };
        Update: {
          achieved_at?: string;
          best_e1rm?: number;
          best_weight?: number;
          best_weight_reps?: number;
          exercise_id?: string;
          user_id?: string;
          workout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approve_tags: boolean;
          avatar_url: string | null;
          branch_id: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          is_private: boolean;
          onboarded_at: string | null;
          show_branch: boolean;
          show_in_rankings: boolean;
          show_schedule: boolean;
          updated_at: string;
          username: string | null;
          usual_schedule: string | null;
        };
        Insert: {
          approve_tags?: boolean;
          avatar_url?: string | null;
          branch_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_private?: boolean;
          onboarded_at?: string | null;
          show_branch?: boolean;
          show_in_rankings?: boolean;
          show_schedule?: boolean;
          updated_at?: string;
          username?: string | null;
          usual_schedule?: string | null;
        };
        Update: {
          approve_tags?: boolean;
          avatar_url?: string | null;
          branch_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_private?: boolean;
          onboarded_at?: string | null;
          show_branch?: boolean;
          show_in_rankings?: boolean;
          show_schedule?: boolean;
          updated_at?: string;
          username?: string | null;
          usual_schedule?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reporter_id?: string;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      routine_exercises: {
        Row: {
          exercise_id: string;
          id: string;
          position: number;
          rest_seconds: number;
          routine_id: string;
          target_reps: number | null;
          target_sets: number;
        };
        Insert: {
          exercise_id: string;
          id?: string;
          position: number;
          rest_seconds?: number;
          routine_id: string;
          target_reps?: number | null;
          target_sets?: number;
        };
        Update: {
          exercise_id?: string;
          id?: string;
          position?: number;
          rest_seconds?: number;
          routine_id?: string;
          target_reps?: number | null;
          target_sets?: number;
        };
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id"];
          },
        ];
      };
      routines: {
        Row: {
          copied_from_user_id: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          copied_from_user_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          copied_from_user_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routines_copied_from_user_id_fkey";
            columns: ["copied_from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routines_copied_from_user_id_fkey";
            columns: ["copied_from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routines_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routines_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_exercises: {
        Row: {
          exercise_id: string;
          id: string;
          notes: string | null;
          position: number;
          rest_seconds: number;
          workout_id: string;
        };
        Insert: {
          exercise_id: string;
          id?: string;
          notes?: string | null;
          position: number;
          rest_seconds?: number;
          workout_id: string;
        };
        Update: {
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          position?: number;
          rest_seconds?: number;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          completed_at: string | null;
          id: string;
          is_done: boolean;
          is_pr: boolean;
          reps: number | null;
          rpe: number | null;
          set_number: number;
          weight_kg: number | null;
          workout_exercise_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          is_done?: boolean;
          is_pr?: boolean;
          reps?: number | null;
          rpe?: number | null;
          set_number: number;
          weight_kg?: number | null;
          workout_exercise_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          is_done?: boolean;
          is_pr?: boolean;
          reps?: number | null;
          rpe?: number | null;
          set_number?: number;
          weight_kg?: number | null;
          workout_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey";
            columns: ["workout_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_tags: {
        Row: {
          created_at: string;
          status: string;
          tagged_user_id: string;
          workout_id: string;
        };
        Insert: {
          created_at?: string;
          status?: string;
          tagged_user_id: string;
          workout_id: string;
        };
        Update: {
          created_at?: string;
          status?: string;
          tagged_user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_tags_tagged_user_id_fkey";
            columns: ["tagged_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_tags_tagged_user_id_fkey";
            columns: ["tagged_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_tags_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workouts: {
        Row: {
          branch_id: string | null;
          created_at: string;
          ended_at: string | null;
          id: string;
          is_published: boolean;
          notes: string | null;
          photo_path: string | null;
          routine_id: string | null;
          started_at: string;
          status: string;
          title: string;
          total_sets: number;
          total_volume: number;
          user_id: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          is_published?: boolean;
          notes?: string | null;
          photo_path?: string | null;
          routine_id?: string | null;
          started_at?: string;
          status?: string;
          title: string;
          total_sets?: number;
          total_volume?: number;
          user_id?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          is_published?: boolean;
          notes?: string | null;
          photo_path?: string | null;
          routine_id?: string | null;
          started_at?: string;
          status?: string;
          title?: string;
          total_sets?: number;
          total_volume?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null;
          branch_id: string | null;
          can_view_content: boolean | null;
          created_at: string | null;
          full_name: string | null;
          id: string | null;
          is_private: boolean | null;
          username: string | null;
          usual_schedule: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          branch_id?: never;
          can_view_content?: never;
          created_at?: string | null;
          full_name?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          username?: string | null;
          usual_schedule?: never;
        };
        Update: {
          avatar_url?: string | null;
          branch_id?: never;
          can_view_content?: never;
          created_at?: string | null;
          full_name?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          username?: string | null;
          usual_schedule?: never;
        };
        Relationships: [];
      };
    };
    Functions: {
      branch_checkins_today: { Args: { bid: string }; Returns: number };
      branch_member_count: { Args: { bid: string }; Returns: number };
      can_view_content: { Args: { owner: string }; Returns: boolean };
      can_view_workout: { Args: { wid: string }; Returns: boolean };
      copy_workout_as_routine: { Args: { p_workout_id: string }; Returns: string };
      f_unaccent: { Args: { "": string }; Returns: string };
      feed_partner_posts: {
        Args: { p_before?: string; p_limit?: number; p_scope: string };
        Returns: {
          author_avatar: string;
          author_id: string;
          author_name: string;
          author_username: string;
          body: string;
          branch_name: string;
          created_at: string;
          days: string[];
          id: string;
          is_open: boolean;
          joined: boolean;
          joined_count: number;
          time_label: string;
          topic: string;
        }[];
      };
      feed_workouts: {
        Args: { p_before?: string; p_limit?: number; p_tab: string };
        Returns: {
          author_avatar: string;
          author_id: string;
          author_name: string;
          author_username: string;
          branch_name: string;
          comment_count: number;
          ended_at: string;
          exercises: Json;
          id: string;
          like_count: number;
          liked: boolean;
          started_at: string;
          title: string;
          top_pr: Json;
          total_sets: number;
          total_volume: number;
        }[];
      };
      finish_workout: { Args: { p_publish: boolean; p_workout_id: string }; Returns: Json };
      followed_by_mutuals: { Args: { p_target: string }; Returns: Json };
      gym_of_branch: { Args: { bid: string }; Returns: string };
      gym_today: { Args: Record<PropertyKey, never>; Returns: string };
      is_accepted_follower: { Args: { owner: string; viewer: string }; Returns: boolean };
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean };
      is_gym_staff: { Args: { gid: string }; Returns: boolean };
      my_blocked_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          blocked_at: string;
          full_name: string;
          id: string;
          username: string;
        }[];
      };
      my_gym_id: { Args: Record<PropertyKey, never>; Returns: string };
      owns_routine: { Args: { rid: string }; Returns: boolean };
      owns_workout: { Args: { wid: string }; Returns: boolean };
      previous_sets: {
        Args: { p_exercise_ids: string[] };
        Returns: {
          exercise_id: string;
          reps: number;
          set_number: number;
          weight_kg: number;
        }[];
      };
      profile_stats: {
        Args: { uid: string };
        Returns: {
          followers: number;
          following: number;
          workouts: number;
        }[];
      };
      save_routine: { Args: { p_items: Json; p_name: string; p_routine_id: string }; Returns: string };
      sync_workout: { Args: { p_exercises: Json; p_title: string; p_workout_id: string }; Returns: undefined };
      username_available: { Args: { name: string }; Returns: boolean };
      workout_of_exercise: { Args: { weid: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
