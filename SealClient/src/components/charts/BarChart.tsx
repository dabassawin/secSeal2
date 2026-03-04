import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sizes } from '@/constants';

export interface BarChartData {
    label: string;
    value: number;
    color: string;
}

interface BarChartProps {
    data: BarChartData[];
    title?: string;
    barHeight?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, barHeight = 200 }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                {title && <Text style={styles.title}>{title}</Text>}
                <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
            </View>
        );
    }

    // Generate Y-axis labels
    const ySteps = 5;
    const stepValue = Math.ceil(maxValue / ySteps);
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => stepValue * (ySteps - i));

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={styles.chartArea}>
                {/* Y-axis labels */}
                <View style={[styles.yAxis, { height: barHeight }]}>
                    {yLabels.map((label, i) => (
                        <Text key={i} style={styles.yLabel}>{label}</Text>
                    ))}
                </View>

                {/* Bars area */}
                <View style={styles.barsWrapper}>
                    {/* Grid lines */}
                    <View style={[styles.gridContainer, { height: barHeight }]}>
                        {yLabels.map((_, i) => (
                            <View key={i} style={styles.gridLine} />
                        ))}
                    </View>

                    {/* Bars */}
                    <View style={[styles.barsContainer, { height: barHeight }]}>
                        {data.map((d, i) => {
                            const heightPercent = (d.value / (stepValue * ySteps)) * 100;
                            return (
                                <View key={i} style={styles.barGroup}>
                                    <View style={styles.barWrapper}>
                                        {d.value > 0 && (
                                            <Text style={styles.barValueLabel}>{d.value.toLocaleString()}</Text>
                                        )}
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: `${Math.max(heightPercent, 1)}%` as any,
                                                    backgroundColor: d.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* X-axis labels */}
                    <View style={styles.xLabelsContainer}>
                        {data.map((d, i) => (
                            <View key={i} style={styles.xLabelWrapper}>
                                <Text style={styles.xLabel} numberOfLines={1}>{d.label}</Text>
                            </View>
                        ))}
                    </View>
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
    chartArea: {
        flexDirection: 'row',
    },
    yAxis: {
        width: 40,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    yLabel: {
        fontSize: 10,
        color: colors.textLight,
    },
    barsWrapper: {
        flex: 1,
        position: 'relative' as any,
    },
    gridContainer: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-evenly',
        paddingHorizontal: 4,
    },
    barGroup: {
        flex: 1,
        alignItems: 'center',
        maxWidth: 60,
    },
    barWrapper: {
        alignItems: 'center',
        width: '100%',
    },
    barValueLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.textLight,
        marginBottom: 2,
    },
    bar: {
        width: '60%',
        minWidth: 16,
        maxWidth: 36,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    xLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingTop: 6,
        paddingHorizontal: 4,
    },
    xLabelWrapper: {
        flex: 1,
        alignItems: 'center',
        maxWidth: 60,
    },
    xLabel: {
        fontSize: 10,
        color: colors.textLight,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        textAlign: 'center',
        padding: sizes.lg,
    },
});
