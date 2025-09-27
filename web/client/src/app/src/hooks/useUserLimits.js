import { useMemo } from 'react';
import { useAuth, useSimulation } from '../App.jsx';

const PLAN_LIMITS = {
  starter: 5,
  pro: 25,
  enterprise: Infinity
};

export const useUserLimits = () => {
  const { membership } = useAuth();
  const { users } = useSimulation();
  
  // Get current plan and additional seats from membership or default values
  const currentPlan = membership?.plan || 'pro';
  const additionalSeats = membership?.additionalSeats || 0;
  
  const limits = useMemo(() => {
    const basePlanLimit = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.pro;
    const totalAllowedUsers = basePlanLimit === Infinity 
      ? Infinity 
      : basePlanLimit + additionalSeats;
    
    const currentUserCount = users?.length || 0;
    const seatsRemaining = totalAllowedUsers === Infinity 
      ? Infinity 
      : Math.max(0, totalAllowedUsers - currentUserCount);
    
    const canAddUsers = totalAllowedUsers === Infinity || currentUserCount < totalAllowedUsers;
    
    const isAtLimit = totalAllowedUsers !== Infinity && currentUserCount >= totalAllowedUsers;
    const isNearLimit = totalAllowedUsers !== Infinity && seatsRemaining <= 2 && seatsRemaining > 0;
    
    return {
      currentPlan,
      additionalSeats,
      basePlanLimit,
      totalAllowedUsers,
      currentUserCount,
      seatsRemaining,
      canAddUsers,
      isAtLimit,
      isNearLimit,
      utilizationPercentage: totalAllowedUsers === Infinity 
        ? 0 
        : Math.round((currentUserCount / totalAllowedUsers) * 100)
    };
  }, [currentPlan, additionalSeats, users]);
  
  const validateUserAddition = (numberOfUsers = 1) => {
    if (limits.totalAllowedUsers === Infinity) {
      return { allowed: true, message: null };
    }
    
    const wouldExceedLimit = limits.currentUserCount + numberOfUsers > limits.totalAllowedUsers;
    
    if (wouldExceedLimit) {
      const availableSlots = limits.seatsRemaining;
      return {
        allowed: false,
        message: `Cannot add ${numberOfUsers} user(s). Only ${availableSlots} slots remaining. Upgrade your plan or add more seats.`,
        availableSlots
      };
    }
    
    return { allowed: true, message: null };
  };
  
  const getUpgradeRecommendation = () => {
    if (limits.currentPlan === 'starter' && limits.isNearLimit) {
      return {
        recommended: 'pro',
        reason: 'Your team is growing! Upgrade to Pro for 25 users and advanced features.'
      };
    }
    
    if (limits.currentPlan === 'pro' && limits.isNearLimit) {
      return {
        recommended: 'enterprise',
        reason: 'Consider Enterprise for unlimited users and advanced features.'
      };
    }
    
    return null;
  };
  
  return {
    ...limits,
    validateUserAddition,
    getUpgradeRecommendation
  };
};

export default useUserLimits;
