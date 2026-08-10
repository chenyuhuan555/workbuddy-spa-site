(function (global) {
  'use strict';
  global.WorkBuddyQuantumRadarTasks = {
    filterTasks(tasks, status) {
      return (Array.isArray(tasks) ? tasks : []).filter(task => !status || status === 'all' || task.status === status);
    },
  };
})(window);
