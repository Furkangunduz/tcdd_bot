import { groupBy } from 'lodash';
import { Types } from 'mongoose';
import { TCDDController } from '../controllers/TCDDController';
import SearchAlert from '../models/SearchAlert';
import { CabinClassAvailability } from '../types/tcdd.types';
import NotificationService from './NotificationService';

interface SearchAlertDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fromStationId: string;
  toStationId: string;
  date: string;
  cabinClass: string;
  departureTimeRange: {
    start: string;
    end: string;
  } | null;
  isActive: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  statusReason?: string;
  lastChecked: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StationData {
  id: string;
  destinations: Array<{
    id: string;
    text: string;
  }>;
}

class CronJobService {
  private static instance: CronJobService;
  private tcddController: TCDDController;
  private stationsMap: Record<string, StationData>;

  private constructor() {
    this.tcddController = new TCDDController();
    this.stationsMap = require('../../stations_map.json');
  }

  public static getInstance(): CronJobService {
    if (!CronJobService.instance) {
      CronJobService.instance = new CronJobService();
    }
    return CronJobService.instance;
  }

  private getStationName(stationId: string): string {
    for (const [stationName, data] of Object.entries(this.stationsMap)) {
      if (data.id === stationId) {
        return stationName;
      }
    }
    return stationId;
  }

  private async getActiveSearchAlerts(): Promise<SearchAlertDocument[]> {
    const alerts = await SearchAlert.find({
      isActive: true,
      status: 'PENDING',
      deletedAt: null,
      departureTimeRange: { $ne: null },
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`[SearchAlerts] Found ${alerts.length} active alerts`);
    return alerts as SearchAlertDocument[];
  }

  private groupSearchAlerts(searchAlerts: SearchAlertDocument[]) {
    const grouped = groupBy(searchAlerts, (alert: SearchAlertDocument) => `${alert.fromStationId}-${alert.toStationId}-${alert.date}`);

    console.log(`[SearchAlerts] Created ${Object.keys(grouped).length} groups from ${searchAlerts.length} alerts`);
    return grouped;
  }

  private formatDate(dateStr: string): string {
    const [day, month, year] = dateStr.split(' ')[0].split('-');
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  }

  private async processSearchGroup(alerts: SearchAlertDocument[]) {
    if (!alerts.length) return;
    try {
      for (const alert of alerts) {
        const currentAlert = await SearchAlert.findById(alert._id);
       
        if (!currentAlert) {
          console.log(`[SearchAlerts] Alert ${alert._id} skipped - invalid data`);
          await SearchAlert.findByIdAndUpdate(alert._id, {
            isActive: false,
            status: 'FAILED',
            lastChecked: new Date(),
            statusReason: 'Invalid data provided',
          });
          continue;
        }

        if(!currentAlert.departureTimeRange) {
          console.log(`[SearchAlerts] Alert ${alert._id} skipped - no departure time range`);

          await SearchAlert.findByIdAndUpdate(alert._id, {
            isActive: false,
            status: 'FAILED',
            lastChecked: new Date(),
            statusReason: 'No departure time range provided',
          });
          continue;
        }


        const dateParts = currentAlert.date.split(' ')[0].split('-');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} 00:00:00`;
        const now = new Date();
        const [datePart] = alert.date.split(' ');
        const [year, month, day] = datePart.split('-');
        const searchDate = new Date(Number(year), Number(month) - 1, Number(day) + 1 );
  

        if (searchDate < now) {
          await SearchAlert.findByIdAndUpdate(alert._id, {
            isActive: false,
            status: 'FAILED',
            lastChecked: now,
            statusReason: 'Search date has passed',
          });
        
          const fromStationName = this.getStationName(alert.fromStationId).split(',')[0].trim().toLowerCase();
          const toStationName = this.getStationName(alert.toStationId).split(',')[0].trim().toLowerCase();
          const fromStationNameCapitalized = fromStationName.charAt(0).toUpperCase() + fromStationName.slice(1);
          const toStationNameCapitalized = toStationName.charAt(0).toUpperCase() + toStationName.slice(1);
            
          await NotificationService.sendPushNotification(
            alert.userId,
            `❌ ${fromStationNameCapitalized} → ${toStationNameCapitalized} Alert Expired`,
            `❌ Your search alert has expired\n\n🚉 Route: ${fromStationNameCapitalized} → ${toStationNameCapitalized}\n📅 Date: ${this.formatDate(alert.date)}`
          );
          console.log(`[SearchAlerts] Alert ${alert._id} expired - past date`);
          continue;
        }


        const searchPayload = {
          fromStationId: currentAlert.fromStationId,
          toStationId: currentAlert.toStationId,
          date: formattedDate,
          passengerCount: 1,
          departureTimeRange: currentAlert.departureTimeRange,
          preferredCabinClass: currentAlert.cabinClass,
          wantHighSpeedTrain: true,
        };
  
    
        const searchResult = await this.tcddController.searchTrainsDirectly(searchPayload);

        if(searchResult.error) {
          console.log(`[SearchAlerts] Alert ${alert._id}  - ${searchResult.error}`);
        }
        
        await SearchAlert.findByIdAndUpdate(alert._id, { lastChecked: now });
        if (searchResult?.data && searchResult?.data.length > 0) {
        
          let foundTrains: {
            trainNumber: string;
            departureStationName: string;
            arrivalStationName: string;
            departureTime: string;
            arrivalTime: string;
            cabinClassAvailabilities: CabinClassAvailability[];
            isHighSpeed: boolean;
        } [] = [];

          searchResult.data.forEach((train: any) => {
            if(train?.cabinClassAvailabilities?.length > 0) {
              foundTrains.push(train);
            }
          });


          if(foundTrains.length > 0) {
            const fromStationName = this.getStationName(alert.fromStationId).split(',')[0].trim().toLowerCase();
            const toStationName = this.getStationName(alert.toStationId).split(',')[0].trim().toLowerCase();
            const fromStationNameCapitalized = fromStationName.charAt(0).toUpperCase() + fromStationName.slice(1);
            const toStationNameCapitalized = toStationName.charAt(0).toUpperCase() + toStationName.slice(1);
            const train = foundTrains[0];

            const departureTime = new Date(train.departureTime);
            const arrivalTime = new Date(train.arrivalTime);
            const formatTime = (date: Date) => {
              return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            };

            const availableSeats = train.cabinClassAvailabilities[0]?.availabilityCount || 0;
            const cabinClassName = train.cabinClassAvailabilities[0]?.cabinClass || 'Unknown';
            const duration = Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60)); // Duration in minutes

            await NotificationService.sendPushNotification(
              alert.userId,
              `🎫 ${availableSeats} seats found: ${fromStationNameCapitalized} → ${toStationNameCapitalized}`,
              `✨ Great news! We found tickets for your journey!\n\n` +
              `🚄 Train: ${train.trainNumber}\n\n` +
              `🎫 Available Seats: ${availableSeats}\n` +
              `💺 Class: ${cabinClassName}\n\n` +
              `🚉 Route: ${fromStationNameCapitalized} → ${toStationNameCapitalized}\n\n` +
              `🕒 Departure: ${formatTime(departureTime)}\n` +
              `🕒 Arrival: ${formatTime(arrivalTime)}\n` +
              `⏱️ Duration: ${Math.floor(duration / 60)}h ${duration % 60}m\n\n` +
              `📅 Date: ${this.formatDate(alert.date)}`,
              {
                type: 'SEATS_FOUND',
                fromStationId: alert.fromStationId,
                toStationId: alert.toStationId,
                date: alert.date,
                cabinClass: alert.cabinClass,
                trainNumber: train.trainNumber,
                departureTime: train.departureTime,
                arrivalTime: train.arrivalTime,
                availableSeats,
                cabinClassName,
                duration
              }
            );
            await SearchAlert.findByIdAndUpdate(alert._id, {
              isActive: false,
              status: 'COMPLETED',
              statusReason: `🎫 ${availableSeats} seats found: ${fromStationNameCapitalized} → ${toStationNameCapitalized} at time ${formatTime(departureTime)}`,
            });
            
          }
        }
      }
    } catch (error) {
      console.error('[SearchAlerts] Error processing search group:', error);
      for (const alert of alerts) {
        const currentAlert = await SearchAlert.findById(alert._id);
        if (!currentAlert || currentAlert.deletedAt || currentAlert.status !== 'PENDING') {
          console.log(`[SearchAlerts] Alert ${alert._id} skipped - deleted or not pending`);
          continue;
        }

        await SearchAlert.findByIdAndUpdate(alert._id, {
          isActive: false,
          status: 'FAILED',
          statusReason: 'Search failed due to technical error',
        });
        console.log(`[SearchAlerts] Alert ${alert._id} failed - technical error`);
      }
    }
  }

  public async processSearchAlerts() {
    console.log('\n[SearchAlerts] Starting search alerts processing');

    try {
      const activeAlerts = await this.getActiveSearchAlerts();
      if (!activeAlerts.length) {
        console.log('[SearchAlerts] No active alerts found');
        return;
      }

      const groupedAlerts = this.groupSearchAlerts(activeAlerts);
      let groupIndex = 1;
      const totalGroups = Object.keys(groupedAlerts).length;

      
      for (const [key, alerts] of Object.entries(groupedAlerts)) {
        console.log(`[SearchAlerts] Processing group ${groupIndex}/${totalGroups}`);
        await this.processSearchGroup(alerts as SearchAlertDocument[]);
        groupIndex++;
      }

      console.log('[SearchAlerts] Completed processing all groups');
    } catch (error) {
      console.error('[SearchAlerts] Error processing search alerts:', error);
    }
  }
}

export default CronJobService.getInstance();
