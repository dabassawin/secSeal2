import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, sizes } from '@/constants';

export interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
    title?: string;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 180, title }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
        return (
            <View style={styles.container}>
                {title && <Text style={styles.title}>{title}</Text>}
                <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
            </View>
        );
    }

    // Build SVG donut segments
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = 35;

    let cumulativePercent = 0;
    const segments = data
        .filter(d => d.value > 0)
        .map(d => {
            const percent = d.value / total;
            const dashArray = `${circumference * percent} ${circumference * (1 - percent)}`;
            const dashOffset = -circumference * cumulativePercent;
            cumulativePercent += percent;
            return {
                ...d,
                percent,
                dashArray,
                dashOffset,
            };
        });

    if (Platform.OS !== 'web') {
        // Fallback for native: show as horizontal bar
        return (
            <View style={styles.container}>
                {title && <Text style={styles.title}>{title}</Text>}
                <View style={styles.barContainer}>
                    {segments.map((seg, i) => (
                        <View
                            key={i}
                            style={{
                                flex: seg.percent,
                                height: 24,
                                backgroundColor: seg.color,
                                borderTopLeftRadius: i === 0 ? 12 : 0,
                                borderBottomLeftRadius: i === 0 ? 12 : 0,
                                borderTopRightRadius: i === segments.length - 1 ? 12 : 0,
                                borderBottomRightRadius: i === segments.length - 1 ? 12 : 0,
                            }}
                        />
                    ))}
                </View>
                <View style={styles.legendContainer}>
                    {data.filter(d => d.value > 0).map((d, i) => (
                        <View key={i} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                            <Text style={styles.legendLabel}>{d.label}</Text>
                            <Text style={styles.legendValue}>{d.value.toLocaleString()}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // Web: SVG donut chart
    const svgHtml = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${segments.map(seg => `
                <circle
                    cx="${cx}" cy="${cy}" r="${radius}"
                    fill="none"
                    stroke="${seg.color}"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${seg.dashArray}"
                    stroke-dashoffset="${seg.dashOffset}"
                    transform="rotate(-90 ${cx} ${cy})"
                    style="transition: all 0.6s ease;"
                />
            `).join('')}
            <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="22" font-weight="bold" fill="#333">${total.toLocaleString()}</text>
            <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="12" fill="#888">รายการทั้งหมด</text>
        </svg>
    `;

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={styles.chartRow}>
                <div
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
                <View style={styles.legendContainer}>
                    {data.filter(d => d.value > 0).map((d, i) => (
                        <View key={i} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.legendLabel}>{d.label}</Text>
                                <Text style={styles.legendPercent}>
                                    {((d.value / total) * 100).toFixed(1)}%
                                </Text>
                            </View>
                            <Text style={styles.legendValue}>{d.value.toLocaleString()}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: sizes.md,
    },
    title: {
        fontSize: sizes.fontMd,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: sizes.md,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    barContainer: {
        flexDirection: 'row',
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: sizes.md,
    },
    legendContainer: {
        gap: 8,
        minWidth: 180,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendLabel: {
        fontSize: sizes.fontSm,
        color: colors.text,
        fontWeight: '500',
    },
    legendPercent: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
    },
    legendValue: {
        fontSize: sizes.fontSm,
        fontWeight: 'bold',
        color: colors.text,
        minWidth: 40,
        textAlign: 'right',
    },
    emptyText: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        textAlign: 'center',
        padding: sizes.lg,
    },
});
