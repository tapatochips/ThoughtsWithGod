import React from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useFirebase } from '../../context/FirebaseContext';

// TODO: Replace these test IDs with the actual AdMob unit IDs
// Get these from: https://apps.admob.com/
const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER // Use test ads in development
  : Platform.OS === 'ios'
    ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with the iOS ad unit ID
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'; // Replace with the Android ad unit ID

interface BannerAdProps {
  size?: BannerAdSize;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({ size = BannerAdSize.BANNER }) => {
  const { isPremiumUser } = useFirebase();

  // Don't show ads for premium users
  if (isPremiumUser) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingVertical: 5,
    }}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
};

export default BannerAdComponent;
