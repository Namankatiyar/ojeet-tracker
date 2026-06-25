-- Optimize RLS policies by wrapping auth.uid() in subqueries to prevent re-evaluation for each row.
-- Also remove duplicate indexes.

-- 1. Profiles
DROP POLICY IF EXISTS "Users read own profiles" ON profiles;
CREATE POLICY "Users read own profiles" ON profiles FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users insert own profiles" ON profiles;
CREATE POLICY "Users insert own profiles" ON profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profiles" ON profiles;
CREATE POLICY "Users update own profiles" ON profiles FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users delete own profiles" ON profiles;
CREATE POLICY "Users delete own profiles" ON profiles FOR DELETE USING ((SELECT auth.uid()) = id);

-- 2. user_data_blobs
DROP POLICY IF EXISTS "Users read own blob" ON user_data_blobs;
CREATE POLICY "Users read own blob" ON user_data_blobs FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own blob" ON user_data_blobs;
CREATE POLICY "Users insert own blob" ON user_data_blobs FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own blob" ON user_data_blobs;
CREATE POLICY "Users update own blob" ON user_data_blobs FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own blob" ON user_data_blobs;
CREATE POLICY "Users delete own blob" ON user_data_blobs FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 3. user_sync_state
DROP POLICY IF EXISTS "user_sync_state_select_own" ON user_sync_state;
CREATE POLICY "user_sync_state_select_own" ON user_sync_state FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_insert_own" ON user_sync_state;
CREATE POLICY "user_sync_state_insert_own" ON user_sync_state FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_update_own" ON user_sync_state;
CREATE POLICY "user_sync_state_update_own" ON user_sync_state FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_delete_own" ON user_sync_state;
CREATE POLICY "user_sync_state_delete_own" ON user_sync_state FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 4. user_sync_chunks
DROP POLICY IF EXISTS "user_sync_chunks_select_own" ON user_sync_chunks;
CREATE POLICY "user_sync_chunks_select_own" ON user_sync_chunks FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_insert_own" ON user_sync_chunks;
CREATE POLICY "user_sync_chunks_insert_own" ON user_sync_chunks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_update_own" ON user_sync_chunks;
CREATE POLICY "user_sync_chunks_update_own" ON user_sync_chunks FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_delete_own" ON user_sync_chunks;
CREATE POLICY "user_sync_chunks_delete_own" ON user_sync_chunks FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 5. user_study_aggregate
DROP POLICY IF EXISTS "user_study_aggregate_select_own" ON user_study_aggregate;
CREATE POLICY "user_study_aggregate_select_own" ON user_study_aggregate FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_insert_own" ON user_study_aggregate;
CREATE POLICY "user_study_aggregate_insert_own" ON user_study_aggregate FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_update_own" ON user_study_aggregate;
CREATE POLICY "user_study_aggregate_update_own" ON user_study_aggregate FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_delete_own" ON user_study_aggregate;
CREATE POLICY "user_study_aggregate_delete_own" ON user_study_aggregate FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 6. study_session_log
DROP POLICY IF EXISTS "Users can view own study session logs" ON study_session_log;
CREATE POLICY "Users can view own study session logs" ON study_session_log FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own study session logs" ON study_session_log;
CREATE POLICY "Users can insert own study session logs" ON study_session_log FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- 7. Drop duplicate index
DROP INDEX IF EXISTS idx_user_sync_chunks_lookup;
