(function (global) {
  'use strict';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function mapError(error) {
    const text = `${error?.code || ''} ${error?.message || ''}`;
    if (text.includes('WORKSPACE_VERSION_CONFLICT') || error?.code === '40001') {
      return appError('WORKSPACE_VERSION_CONFLICT', error);
    }
    return appError('BACKEND_REQUEST_FAILED', error);
  }

  function createWorkspaceClient({ supabase, getProfile }) {
    let retained = null;

    function requireReader() {
      const profile = getProfile();
      if (!profile) throw appError('AUTH_REQUIRED');
      if (profile.status !== 'active') throw appError('ACCOUNT_DISABLED');
      if (profile.must_change_password) throw appError('PASSWORD_CHANGE_REQUIRED');
      return profile;
    }

    function requireWriter() {
      const profile = requireReader();
      if (profile.role !== 'admin' && profile.role !== 'editor') throw appError('WRITE_REQUIRED');
      return profile;
    }

    function requireAdministrator() {
      const profile = requireReader();
      if (profile.role !== 'admin') throw appError('ADMIN_REQUIRED');
      return profile;
    }

    async function loadWorkspace() {
      requireReader();
      const { data, error } = await supabase.from('workspace_state').select('workspace_id, version, data, updated_at').eq('workspace_id', 'main').single();
      if (error?.code === 'PGRST116') {
        retained = { version: 0, data: {} };
        return retained;
      }
      if (error) throw mapError(error);
      retained = data ? { version: data.version, data: data.data } : { version: 0, data: {} };
      return retained;
    }

    async function saveWorkspace({ expectedVersion, data }) {
      requireWriter();
      const { data: result, error } = await supabase.rpc('save_workspace_state', {
        expected_version: expectedVersion,
        next_data: data
      });
      if (error) throw mapError(error);
      retained = { version: result.version, data: result.data };
      return retained;
    }

    async function loadPrivateSettings() {
      requireWriter();
      const { data, error } = await supabase.from('private_settings').select('data').eq('workspace_id', 'main').maybeSingle();
      if (error) throw mapError(error);
      return data?.data || {};
    }

    async function savePrivateSettings(settings) {
      requireWriter();
      const { data, error } = await supabase.from('private_settings').upsert({ workspace_id: 'main', data: settings }).select('data').single();
      if (error) throw mapError(error);
      return data.data;
    }

    async function uploadFile({ path, blob, contentType }) {
      requireWriter();
      const { data, error } = await supabase.storage.from('workbuddy-files').upload(path, blob, { contentType, upsert: false });
      if (error) throw mapError(error);
      return data;
    }

    async function downloadFile(path) {
      requireReader();
      const { data, error } = await supabase.storage.from('workbuddy-files').download(path);
      if (error) throw mapError(error);
      return data;
    }

    async function invokeAdminFunction(name, body) {
      requireAdministrator();
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw mapError(error);
      return data;
    }

    function clear() { retained = null; }

    return Object.freeze({
      loadWorkspace, saveWorkspace, loadPrivateSettings, savePrivateSettings,
      uploadFile, downloadFile, invokeAdminFunction, clear,
      getRetainedWorkspace: () => retained
    });
  }

  global.WorkBuddyWorkspace = Object.freeze({ createWorkspaceClient });
})(window);
