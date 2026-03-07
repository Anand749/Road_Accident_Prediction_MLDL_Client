import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import useGeolocation from '../hooks/useGeolocation.js';
import useVoiceCommand from '../hooks/useVoiceCommand.js';
import api from '../utils/api.js';
import toast from 'react-hot-toast';

const SOSButton = () => {
  const { user } = useAuth();
  const { position, error: geoError } = useGeolocation();

  const triggerSOS = useCallback(
    async (via = 'button') => {
      if (!user) return;
      if (geoError || !position) {
        toast.error('Location not available. Please enable GPS.');
        return;
      }
      try {
        await api.post('/sos/trigger', {
          location: position,
          triggeredVia: via,
        });
        toast.success('🚨 SOS Alert Sent! Help is on the way.');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to send SOS');
      }
    },
    [geoError, position, user]
  );

  const { listening, lastTranscript } = useVoiceCommand(triggerSOS);

  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          className="sos-pulse relative h-20 w-20 rounded-full bg-gradient-to-br from-accentRed to-red-700 flex items-center justify-center border-4 border-red-400/90 text-lg font-rajdhani font-semibold tracking-[0.3em] text-white uppercase"
          onClick={() => triggerSOS('button')}
        >
          SOS
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accentBlue flex items-center justify-center text-[9px] font-semibold">
            !
          </span>
        </motion.button>
      </div>

      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2 items-start">
        <div className="glass-card px-3 py-2 flex items-center gap-2 text-xs text-gray-200">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center border border-accentBlue/60 bg-surface/80 ${
              listening ? 'mic-pulse' : ''
            }`}
          >
            <span className="material-icons text-[16px]">mic</span>
          </div>
          <div>
            <p className="font-semibold tracking-wide text-[10px] uppercase text-accentBlue">
              Voice Listener
            </p>
            <p className="text-[11px] text-gray-300">
              Say &quot;sos&quot;, &quot;help me&quot; or &quot;emergency&quot;
            </p>
          </div>
        </div>
        {lastTranscript && (
          <div className="glass-card px-3 py-1 text-[11px] text-gray-300 max-w-xs">
            <span className="text-accentBlue/80 mr-1">Heard:</span>
            {lastTranscript}
          </div>
        )}
      </div>
    </>
  );
};

export default SOSButton;

