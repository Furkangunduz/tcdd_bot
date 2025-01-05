import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { AlertItem } from '~/components/home/AlertItem';
import { DateTimePickers } from '~/components/home/DateTimePickers';
import { EmptyState } from '~/components/home/EmptyState';
import { SearchForm } from '~/components/home/SearchForm';
import { StationModal } from '~/components/home/StationModal';
import { StatusFilter } from '~/components/home/StatusFilter';
import { useDebounce } from '~/hooks/useDebounce';
import { useSearchAlerts } from '~/hooks/useSearchAlerts';
import { CabinClass, Station, searchAlertsApi, tcddApi } from '~/lib/api';
import { AD_UNIT_IDS } from '~/lib/constants';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}


const CustomLayoutAnimation = {
  duration: 150,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

const adUnitId = AD_UNIT_IDS.INTERSTITIAL[Platform.OS === 'ios' ? 'IOS' : 'ANDROID'];

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
  keywords: ['train', 'travel', 'transportation'],
});

export default function Home() {
  const { searchAlerts, isLoading: isLoadingAlerts, mutate: mutateAlerts } = useSearchAlerts();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const currentSwipeableRef = useRef<string | null>(null);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({}).current;
  const snapPoints = useMemo(() => ['85%'], []);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['PENDING']);

  const filteredAlerts = useMemo(() => {
    return searchAlerts.filter(alert => selectedStatuses.includes(alert.status));
  }, [searchAlerts, selectedStatuses]);

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 10);
    return date;
  }, []);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [searchForm, setSearchForm] = useState({
    from: '',
    fromId: '',
    to: '',
    toId: '',
    date: '',
    cabinClass: '2',
    cabinClassName: 'EKONOMİ',
    departureTimeRange: {
      start: '00:00',
      end: '23:59'
    },
    wantHighSpeedTrain: true
  });

  const [departureStations, setDepartureStations] = useState<Station[]>([]);
  const [arrivalStations, setArrivalStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [showStationModal, setShowStationModal] = useState<'from' | 'to' | 'cabin' | null>(null);
  const [stationSearch, setStationSearch] = useState('');
  const debouncedSearch = useDebounce(stationSearch, 300);

  const [cabinClasses, setCabinClasses] = useState<CabinClass[]>([]);
  const [isLoadingCabinClasses, setIsLoadingCabinClasses] = useState(false);
  const [cabinClassesError, setCabinClassesError] = useState<string | null>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [spinAnim] = useState(new Animated.Value(0));

  const fetchCabinClasses = async () => {
    try {
      setIsLoadingCabinClasses(true);
      setCabinClassesError(null);
      
      const response = await tcddApi.getCabinClasses();
      
      if (response?.data?.data) {
        setCabinClasses(response.data.data);
      } else {
        console.warn('⚠️ No cabin classes data in response');
        setCabinClassesError('No cabin classes available');
      }
    } catch (error) {
      console.error('❌ Error in fetchCabinClasses:', error);
      setCabinClassesError('Failed to load cabin classes');
      setCabinClasses([]);
    } finally {
      setIsLoadingCabinClasses(false);
    }
  };

  useEffect(() => {
    const fetchDepartureStations = async () => {
      try {
        setIsLoadingStations(true);
        const response = await tcddApi.getDepartureStations();
        if (response.data.data) {
          setDepartureStations(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching departure stations:', error);
        setDepartureStations([]);
      } finally {
        setIsLoadingStations(false);
      }
    };

    fetchDepartureStations();
  }, []);

  useEffect(() => {
    const fetchArrivalStations = async () => {
      if (!searchForm.fromId) {
        setArrivalStations([]);
        return;
      }

      try {
        setIsLoadingStations(true);
        const response = await tcddApi.getArrivalStations(searchForm.fromId);
        if (response?.data?.data) {
          setArrivalStations(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching arrival stations:', error);
        setArrivalStations([]); 
      } finally {
        setIsLoadingStations(false);
      }
    };

    fetchArrivalStations();
  }, [searchForm.fromId]);

  useEffect(() => {
    fetchCabinClasses();
  }, []);

  const handleStationSelect = (station: Station, type?: 'from' | 'to') => {
    const selectionType = type || showStationModal;
    
    if (selectionType === 'from') {
      setSearchForm(prev => ({
        ...prev,
        from: station.name,
        fromId: station.id,
        to: '',
        toId: '',
      }));
    } else if (selectionType === 'to') {
      setSearchForm(prev => ({
        ...prev,
        to: station.name,
        toId: station.id,
      }));
    }
    setShowStationModal(null);
    setStationSearch('');
  };

  const handleCabinClassSelect = (cabinClass: CabinClass) => {
    setSearchForm(prev => ({
      ...prev,
      cabinClass: cabinClass.id,
      cabinClassName: cabinClass.name
    }));
    setShowStationModal(null);
  };

  const filteredStations = useMemo(() => {
    const stations = showStationModal === 'from' ? departureStations : arrivalStations;
    if (!Array.isArray(stations)) return [];
    if (!debouncedSearch) return stations;
  
    const normalizeString = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
  
    const searchLower = normalizeString(debouncedSearch);
    return stations.filter(station => 
      normalizeString(station.name).includes(searchLower)
    );
  }, [showStationModal, departureStations, arrivalStations, debouncedSearch]);
  
  const handleSearchPress = () => {
    if (isAdLoaded) {
      try {
        interstitial.show();
      } catch (error) {
        console.warn('Failed to show ad, opening bottom sheet directly:', error);
        bottomSheetRef.current?.expand();
      }
    } else {
      bottomSheetRef.current?.expand();
    }
  };

  const handleCloseBottomSheet = () => {
    bottomSheetRef.current?.close();
  };

  const handleSwapStations = () => {
    if (!searchForm.from || !searchForm.to) return;

    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      })
    ]).start();

    setSearchForm(prev => ({
      ...prev,
      from: prev.to,
      fromId: prev.toId,
      to: prev.from,
      toId: prev.fromId,
    }));
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await searchAlertsApi.deleteSearchAlert(alertId);
      LayoutAnimation.configureNext(CustomLayoutAnimation);
      await mutateAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const handleDeclineAlert = async (alertId: string) => {
    try {
      await searchAlertsApi.declineSearchAlert(alertId);
      LayoutAnimation.configureNext(CustomLayoutAnimation);
      await mutateAlerts();
    } catch (error) {
      console.error('Error declining alert:', error);
    }
  };

  const resetSearchForm = () => {
    setSearchForm({
      from: '',
      fromId: '',
      to: '',
      toId: '',
      date: '',
      cabinClass: '1',
      cabinClassName: 'EKONOMİ',
      departureTimeRange: {
        start: '00:00',
        end: '23:59'
      },
      wantHighSpeedTrain: true
    });
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdLoaded(false);
      interstitial.load();
      bottomSheetRef.current?.expand();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('Ad failed to load:', error);
      setIsAdLoaded(false);
    });

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  useEffect(() => {
    const startSpinning = () => {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    };

    startSpinning();
  }, []);

  const handleBulkDecline = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Decline All Alerts',
        'Are you sure you want to decline all processing alerts? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          },
          {
            text: 'Decline All',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await searchAlertsApi.bulkDeclineSearchAlerts('PROCESSING');
              LayoutAnimation.configureNext(CustomLayoutAnimation);
              await mutateAlerts();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error declining alerts:', error);
    }
  };

  const handleBulkDelete = async (status: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Delete All Alerts',
        `Are you sure you want to delete all ${status.toLowerCase()} alerts? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await searchAlertsApi.bulkDeleteSearchAlerts(status);
              LayoutAnimation.configureNext(CustomLayoutAnimation);
              await mutateAlerts();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error deleting alerts:', error);
    }
  };

  const handleSwipeStart = (alertId: string) => {
    if (currentSwipeableRef.current && currentSwipeableRef.current !== alertId) {
      // Close the previously opened swipeable
      const prevSwipeable = swipeableRefs[currentSwipeableRef.current];
      if (prevSwipeable) {
        prevSwipeable.close();
      }
    }
    currentSwipeableRef.current = alertId;
  };

  const handleSwipeClose = (alertId: string) => {
    if (currentSwipeableRef.current === alertId) {
      currentSwipeableRef.current = null;
    }
  };

  const setSwipeableRef = (alertId: string, ref: Swipeable | null) => {
    swipeableRefs[alertId] = ref;
  };

  return (
    <SafeAreaView className='flex-1 bg-background'>
      <View className="flex-1 bg-background">
        <View className="flex-1 px-6">
          {isLoadingAlerts ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#666" />
            </View>
          ) : searchAlerts.length > 0 ? (
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground mb-4 mt-6">
                Your Active Alerts
              </Text>
              <View className="flex-row items-center justify-between mb-4">
                <StatusFilter 
                  selectedStatuses={selectedStatuses}
                  onStatusChange={setSelectedStatuses}
                />
                <View className="flex-row gap-2">
                  {selectedStatuses.includes('PROCESSING') && filteredAlerts.length > 0 && (
                    <TouchableOpacity
                      onPress={handleBulkDecline}
                      className="bg-muted/80 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5"
                    >
                      <Ionicons name="close-circle-outline" size={16} color={isDark ? '#fff' : '#000'} />
                      <Text className="text-foreground font-medium text-xs">Decline All</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedStatuses.includes('COMPLETED') || selectedStatuses.includes('FAILED')) && filteredAlerts.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleBulkDelete(selectedStatuses[0])}
                      className="bg-destructive/90 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shadow-sm"
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text className="text-white font-medium text-xs">Delete All</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <ScrollView className="flex-1 gap-4">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <AlertItem
                      key={alert._id}
                      alert={alert}
                      onDelete={() => handleDeleteAlert(alert._id)}
                      onDecline={() => handleDeclineAlert(alert._id)}
                      spinAnim={spinAnim}
                      isDark={isDark}
                      onSwipeStart={() => handleSwipeStart(alert._id)}
                      onSwipeClose={() => handleSwipeClose(alert._id)}
                      setSwipeableRef={(ref) => setSwipeableRef(alert._id, ref)}
                    />
                  ))
                ) : (
                  <EmptyState selectedStatuses={selectedStatuses} />
                )}
              </ScrollView>
            </View>
          ) : (
            <EmptyState  />
          )}
        </View>

        <View className="p-6">
          <TouchableOpacity
            onPress={handleSearchPress}
            className="bg-primary w-full h-14 rounded-xl items-center justify-center shadow-sm flex-row gap-6"
          >
            <Ionicons name="search" size={22} color={isDark ? '#000' : '#fff'}  />
            <Text className="text-primary-foreground font-semibold text-base">
              Start Searching
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showStationModal !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowStationModal(null)}
        >
          <StationModal
            type={showStationModal}
            onClose={() => setShowStationModal(null)}
            stationSearch={stationSearch}
            onSearchChange={setStationSearch}
            isLoading={isLoadingStations}
            stations={filteredStations}
            onStationSelect={handleStationSelect}
            cabinClasses={cabinClasses}
            isLoadingCabinClasses={isLoadingCabinClasses}
            cabinClassesError={cabinClassesError}
            onCabinClassSelect={handleCabinClassSelect}
            onRetryLoadCabinClasses={fetchCabinClasses}
          />
        </Modal>

        <DateTimePickers
          showDatePicker={showDatePicker}
          showTimePicker={showTimePicker}
          searchForm={searchForm}
          onDateChange={(date) => setSearchForm(prev => ({ ...prev, date }))}
          onTimeChange={(time, type) => 
            setSearchForm(prev => ({
              ...prev,
              departureTimeRange: {
                ...prev.departureTimeRange,
                [type]: time
              }
            }))
          }
          onCloseDatePicker={() => setShowDatePicker(false)}
          onCloseTimePicker={() => setShowTimePicker(null)}
          maxDate={maxDate}
        />
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? 'hsl(224 71% 4%)' : 'hsl(0 0% 100%)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 2,
          borderColor: isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)',
          shadowColor: isDark ? 'hsl(240 3.7% 15.9%)' : '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 8,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
          width: 60,
        }}
        handleStyle={{
          backgroundColor: 'transparent',
          paddingVertical: 12,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <View
          style={[
            styles.contentContainer, 
            { 
              backgroundColor: isDark ? 'hsl(224 71% 4%)' : 'hsl(0 0% 100%)',
            }
          ]}
        >
          <View className="flex-1 w-full">
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-2xl font-bold text-foreground">
                Create New Alert
              </Text>
              <TouchableOpacity 
                onPress={handleCloseBottomSheet}
                className="p-2"
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDark ? '#fff' : '#000'} 
                />
              </TouchableOpacity>
            </View>
            
            <BottomSheetScrollView className="flex-1 w-full">
              <SearchForm
                searchForm={searchForm}
                onStationSelect={handleStationSelect}
                onShowStationModal={setShowStationModal}
                onShowDatePicker={() => setShowDatePicker(true)}
                onShowTimePicker={setShowTimePicker}
                onSwapStations={handleSwapStations}
                onDateChange={(date) => setSearchForm(prev => ({ ...prev, date }))}
                closeBottomSheet={handleCloseBottomSheet}
                resetSearchForm={resetSearchForm}
                onToggleHighSpeed={(value) => setSearchForm(prev => ({ ...prev, wantHighSpeedTrain: value }))}
                spin={spin}
                arrivalStations={arrivalStations}
                setDepartureTimeRange={
                  (timeRange) => {
                    setSearchForm(prev => ({
                      ...prev,
                      departureTimeRange: timeRange
                    }));
                  }
                }
              />
            </BottomSheetScrollView>

          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  deleteSheetContent: {
    padding: 20,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deleteDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  deleteButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    color: 'white',
  },
});