import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';

interface DateTimePickersProps {
  showDatePicker: boolean;
  showTimePicker: 'start' | 'end' | null;
  searchForm: {
    date: string;
    departureTimeRange: {
      start: string;
      end: string;
    };
  };
  onDateChange: (date: string) => void;
  onTimeChange: (time: string, type: 'start' | 'end') => void;
  onCloseDatePicker: () => void;
  onCloseTimePicker: () => void;
  maxDate: Date;
}

export function DateTimePickers({
  showDatePicker,
  showTimePicker,
  searchForm,
  onDateChange,
  onTimeChange,
  onCloseDatePicker,
  onCloseTimePicker,
  maxDate
}: DateTimePickersProps) {
  const { t } = useTranslation();

  return (
    <>
      {Platform.OS === 'ios' && showTimePicker ? (
        <Modal
          visible={!!showTimePicker}
          transparent={true}
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-card p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={onCloseTimePicker}>
                  <Text className="text-primary text-base">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCloseTimePicker}>
                  <Text className="text-primary text-base">{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={
                  showTimePicker === 'start' && searchForm.departureTimeRange.start
                    ? new Date(`2000-01-01T${searchForm.departureTimeRange.start}:00+03:00`)
                    : showTimePicker === 'end' && searchForm.departureTimeRange.end
                    ? new Date(`2000-01-01T${searchForm.departureTimeRange.end}:00+03:00`)
                    : new Date()
                }
                mode="time"
                display="spinner"
                timeZoneOffsetInMinutes={180}
                onChange={(event, selectedDate) => {
                  if (selectedDate && showTimePicker) {
                    const hours = selectedDate.getHours().toString().padStart(2, '0');
                    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                    const timeString = `${hours}:${minutes}`;
                    onTimeChange(timeString, showTimePicker);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : Platform.OS === 'android' && showTimePicker ? (
        <DateTimePicker
          value={
            showTimePicker === 'start' && searchForm.departureTimeRange.start
              ? new Date(`2000-01-01T${searchForm.departureTimeRange.start}:00+03:00`)
              : showTimePicker === 'end' && searchForm.departureTimeRange.end
              ? new Date(`2000-01-01T${searchForm.departureTimeRange.end}:00+03:00`)
              : new Date()
          }
          mode="time"
          display="default"
          timeZoneOffsetInMinutes={-180}
          onChange={(event, selectedDate) => {
            onCloseTimePicker();
            if (event.type === 'set' && selectedDate && showTimePicker) {
              const hours = selectedDate.getHours().toString().padStart(2, '0');
              const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
              const timeString = `${hours}:${minutes}`;
              onTimeChange(timeString, showTimePicker);
            }
          }}
        />
      ) : null}

      {/* Date picker modals */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-card p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={onCloseDatePicker}>
                  <Text className="text-primary text-base">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (!searchForm.date) {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      onDateChange(tomorrow.toISOString().split('T')[0]);
                    }
                    onCloseDatePicker();
                  }}
                >
                  <Text className="text-primary text-base">{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={searchForm.date ? new Date(searchForm.date) : new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const formattedDate = selectedDate.toISOString().split('T')[0];
                    onDateChange(formattedDate);
                  }
                }}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : showDatePicker && (
        <DateTimePicker
          value={searchForm.date ? new Date(searchForm.date) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            onCloseDatePicker();
            if (event.type === 'set' && selectedDate) {
              const formattedDate = selectedDate.toISOString().split('T')[0];
              onDateChange(formattedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </>
  );
} 