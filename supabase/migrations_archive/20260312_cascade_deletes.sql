-- Add ON DELETE CASCADE to foreign keys referencing user tables

-- user_sync_state
ALTER TABLE user_sync_state DROP CONSTRAINT IF EXISTS user_sync_state_user_id_fkey;
ALTER TABLE user_sync_state ADD CONSTRAINT user_sync_state_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- user_sync_chunks
ALTER TABLE user_sync_chunks DROP CONSTRAINT IF EXISTS user_sync_chunks_user_id_fkey;
ALTER TABLE user_sync_chunks ADD CONSTRAINT user_sync_chunks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- user_study_aggregate
ALTER TABLE user_study_aggregate DROP CONSTRAINT IF EXISTS user_study_aggregate_user_id_fkey;
ALTER TABLE user_study_aggregate ADD CONSTRAINT user_study_aggregate_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- study_session_log
ALTER TABLE study_session_log DROP CONSTRAINT IF EXISTS study_session_log_user_id_fkey;
ALTER TABLE study_session_log ADD CONSTRAINT study_session_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- user_data_blobs
ALTER TABLE user_data_blobs DROP CONSTRAINT IF EXISTS user_data_blobs_user_id_fkey;
ALTER TABLE user_data_blobs ADD CONSTRAINT user_data_blobs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- live_activity
ALTER TABLE live_activity DROP CONSTRAINT IF EXISTS live_activity_user_id_fkey;
ALTER TABLE live_activity ADD CONSTRAINT live_activity_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- peer_visibility_settings
ALTER TABLE peer_visibility_settings DROP CONSTRAINT IF EXISTS peer_visibility_settings_user_id_fkey;
ALTER TABLE peer_visibility_settings ADD CONSTRAINT peer_visibility_settings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- peer_relationships (user_id_1 and user_id_2)
ALTER TABLE peer_relationships DROP CONSTRAINT IF EXISTS peer_relationships_user_id_1_fkey;
ALTER TABLE peer_relationships ADD CONSTRAINT peer_relationships_user_id_1_fkey 
    FOREIGN KEY (user_id_1) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE peer_relationships DROP CONSTRAINT IF EXISTS peer_relationships_user_id_2_fkey;
ALTER TABLE peer_relationships ADD CONSTRAINT peer_relationships_user_id_2_fkey 
    FOREIGN KEY (user_id_2) REFERENCES profiles(id) ON DELETE CASCADE;

-- profiles references auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
