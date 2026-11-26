import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setNotifications((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const success = useCallback((msg, duration) => showNotification(msg, 'success', duration), [showNotification]);
  const error = useCallback((msg, duration) => showNotification(msg, 'error', duration), [showNotification]);
  const info = useCallback((msg, duration) => showNotification(msg, 'info', duration), [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, info, removeNotification }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start p-4 rounded-xl shadow-lg border text-sm ${
                n.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : n.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="mr-3 mt-0.5 flex-shrink-0">
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {n.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1 font-medium leading-snug">{n.message}</div>
              <button
                onClick={() => removeNotification(n.id)}
                className="ml-2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
