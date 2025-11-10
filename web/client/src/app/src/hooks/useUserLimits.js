import { useMemo, useState, useEffect } from 'react';
import { useAuth, useSimulation } from '../App.jsx';

const PLAN_LIMITS = {
  starter: 1,
  pro: 10,
  enterprise: 50
};

export const useUserLimits = () => {
  const { membership } = useAuth();
  const { users } = useSimulation();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch subscription data from API
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/billing/subscription', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
        } else {
          console.warn('Failed to fetch subscription data, using defaults');
          setSubscriptionData({
            plan: 'pro',
            additionalSeats: 0,
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setSubscriptionData({
          plan: 'pro',
          additionalSeats: 0,
          status: 'active'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, []);
  
  // Get current plan and additional seats from API data or fallback to membership/defaults
  const currentPlan = subscriptionData?.plan || membership?.plan || 'pro';
  const additionalSeats = subscriptionData?.additionalSeats || membership?.additionalSeats || 0;
  
  const limits = useMemo(() => {
    // Use includedSeats from API if available, otherwise fall back to PLAN_LIMITS
    const basePlanLimit = subscriptionData?.includedSeats || PLAN_LIMITS[currentPlan] || PLAN_LIMITS.pro;
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
  }, [currentPlan, additionalSeats, users, subscriptionData]);
  
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
        reason: 'Your team is growing! Upgrade to Pro for up to 10 users and advanced features.'
      };
    }
    
    if (limits.currentPlan === 'pro' && limits.isNearLimit) {
      return {
        recommended: 'enterprise',
        reason: 'Consider Enterprise for up to 50 users and advanced features.'
      };
    }
    
    return null;
  };
  
  const refreshSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/subscription', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    ...limits,
    validateUserAddition,
    getUpgradeRecommendation,
    loading,
    subscriptionData,
    refreshSubscription
  };
};

export default useUserLimits;

