import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Tells Expo how to handle notifications when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface PushNotificationState {
    expoPushToken?: string;
    notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>();

    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            if (token) setExpoPushToken(token);
        });

        // Fired when a notification is received while the app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
            setNotification(notification);
        });

        // Fired when a user taps on or interacts with a notification 
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification
    };
};

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return undefined;
        }

        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } else {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            }
        } catch (e) {
            console.error('❌ Failed to get Expo Push Token:', e);
            // ❌ อย่าเก็บ error message เป็น token เด็ดขาด
            return undefined;
        }
    } else {
    }

    return token;
}
