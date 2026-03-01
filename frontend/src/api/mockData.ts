// src/api/mockData.ts
// Real backend data captured from localhost:8000 — used when the backend is unreachable.
// Mirrors the exact shapes from src/types/index.ts so all charts render.

import type {
    KpisResponse,
    WorkloadHeatmapResponse,
    WorkloadDistributionItem,
    TimeSeriesResponse,
    VmsResponse,
    AnomaliesResponse,
    RocResponse,
    Forecast24hResponse,
    Forecast7DayResponse,
    TopologyResponse,
} from '../types'

export const MOCK_KPIS: KpisResponse = {
    "avg_energy_efficiency": 0.5003,
    "avg_compute_value": 3373.1224,
    "vms_wasting_energy": 135094,
    "vms_wasting_energy_pct": 6.75,
    "behavioral_anomalies": 0,
    "fleet_power_kw": 500154.56,
    "total_vm_records": 2000000,
    "last_updated": "2026-03-01T02:19:48.845179+00:00"
}

export const MOCK_HEATMAP: WorkloadHeatmapResponse = {
    "rows": [
        "compute",
        "io",
        "network"
    ],
    "cols": [
        "avg_cpu",
        "avg_memory",
        "avg_network",
        "avg_power",
        "avg_efficiency",
        "avg_compute_value",
        "avg_throughput"
    ],
    "matrix": [
        [
            49.985,
            49.95,
            500.155,
            250.08,
            0.5001,
            430.8349,
            885.625
        ],
        [
            50.0375,
            49.9925,
            500.3425,
            249.8825,
            0.5006,
            22499.8226,
            29523.6475
        ],
        [
            50.0275,
            49.97,
            499.5775,
            250.15,
            0.5004,
            1458.4912,
            2396.7725
        ]
    ],
    "meta": {
        "compute": {
            "high": 180154,
            "low": 179411,
            "medium": 179628
        },
        "io": {
            "high": 180702,
            "low": 179578,
            "medium": 180509
        },
        "network": {
            "high": 179741,
            "low": 179965,
            "medium": 180737
        }
    }
}

export const MOCK_DISTRIBUTION: WorkloadDistributionItem[] = [
    {
        "task_type": "compute",
        "task_priority": "high",
        "task_status": "completed",
        "count": 53825,
        "pct": 3.69
    },
    {
        "task_type": "compute",
        "task_priority": "high",
        "task_status": "running",
        "count": 54059,
        "pct": 3.71
    },
    {
        "task_type": "compute",
        "task_priority": "high",
        "task_status": "waiting",
        "count": 54112,
        "pct": 3.71
    },
    {
        "task_type": "compute",
        "task_priority": "low",
        "task_status": "completed",
        "count": 53714,
        "pct": 3.68
    },
    {
        "task_type": "compute",
        "task_priority": "low",
        "task_status": "running",
        "count": 53583,
        "pct": 3.67
    },
    {
        "task_type": "compute",
        "task_priority": "low",
        "task_status": "waiting",
        "count": 54058,
        "pct": 3.71
    },
    {
        "task_type": "compute",
        "task_priority": "medium",
        "task_status": "completed",
        "count": 53536,
        "pct": 3.67
    },
    {
        "task_type": "compute",
        "task_priority": "medium",
        "task_status": "running",
        "count": 54048,
        "pct": 3.71
    },
    {
        "task_type": "compute",
        "task_priority": "medium",
        "task_status": "waiting",
        "count": 54104,
        "pct": 3.71
    },
    {
        "task_type": "io",
        "task_priority": "high",
        "task_status": "completed",
        "count": 54111,
        "pct": 3.71
    },
    {
        "task_type": "io",
        "task_priority": "high",
        "task_status": "running",
        "count": 54111,
        "pct": 3.71
    },
    {
        "task_type": "io",
        "task_priority": "high",
        "task_status": "waiting",
        "count": 54411,
        "pct": 3.73
    },
    {
        "task_type": "io",
        "task_priority": "low",
        "task_status": "completed",
        "count": 54025,
        "pct": 3.7
    },
    {
        "task_type": "io",
        "task_priority": "low",
        "task_status": "running",
        "count": 53981,
        "pct": 3.7
    },
    {
        "task_type": "io",
        "task_priority": "low",
        "task_status": "waiting",
        "count": 53650,
        "pct": 3.68
    },
    {
        "task_type": "io",
        "task_priority": "medium",
        "task_status": "completed",
        "count": 53859,
        "pct": 3.69
    },
    {
        "task_type": "io",
        "task_priority": "medium",
        "task_status": "running",
        "count": 54547,
        "pct": 3.74
    },
    {
        "task_type": "io",
        "task_priority": "medium",
        "task_status": "waiting",
        "count": 54105,
        "pct": 3.71
    },
    {
        "task_type": "network",
        "task_priority": "high",
        "task_status": "completed",
        "count": 53815,
        "pct": 3.69
    },
    {
        "task_type": "network",
        "task_priority": "high",
        "task_status": "running",
        "count": 53802,
        "pct": 3.69
    },
    {
        "task_type": "network",
        "task_priority": "high",
        "task_status": "waiting",
        "count": 54092,
        "pct": 3.71
    },
    {
        "task_type": "network",
        "task_priority": "low",
        "task_status": "completed",
        "count": 53908,
        "pct": 3.7
    },
    {
        "task_type": "network",
        "task_priority": "low",
        "task_status": "running",
        "count": 54027,
        "pct": 3.71
    },
    {
        "task_type": "network",
        "task_priority": "low",
        "task_status": "waiting",
        "count": 54085,
        "pct": 3.71
    },
    {
        "task_type": "network",
        "task_priority": "medium",
        "task_status": "completed",
        "count": 54407,
        "pct": 3.73
    },
    {
        "task_type": "network",
        "task_priority": "medium",
        "task_status": "running",
        "count": 54236,
        "pct": 3.72
    },
    {
        "task_type": "network",
        "task_priority": "medium",
        "task_status": "waiting",
        "count": 53996,
        "pct": 3.7
    }
]

export const MOCK_TIMESERIES: TimeSeriesResponse = {
    "metric": "energy_efficiency",
    "bucket": "day",
    "task_type": "",
    "series": [
        {
            "timestamp": "2023-01-01 00:00:00",
            "value": 0.4984,
            "record_count": 7987
        },
        {
            "timestamp": "2023-01-02 00:00:00",
            "value": 0.5026,
            "record_count": 7990
        },
        {
            "timestamp": "2023-01-03 00:00:00",
            "value": 0.5014,
            "record_count": 8086
        },
        {
            "timestamp": "2023-01-04 00:00:00",
            "value": 0.4944,
            "record_count": 8106
        },
        {
            "timestamp": "2023-01-05 00:00:00",
            "value": 0.4958,
            "record_count": 8057
        },
        {
            "timestamp": "2023-01-06 00:00:00",
            "value": 0.5073,
            "record_count": 8157
        },
        {
            "timestamp": "2023-01-07 00:00:00",
            "value": 0.5018,
            "record_count": 8135
        },
        {
            "timestamp": "2023-01-08 00:00:00",
            "value": 0.4976,
            "record_count": 8127
        },
        {
            "timestamp": "2023-01-09 00:00:00",
            "value": 0.501,
            "record_count": 8049
        },
        {
            "timestamp": "2023-01-10 00:00:00",
            "value": 0.5034,
            "record_count": 8079
        },
        {
            "timestamp": "2023-01-11 00:00:00",
            "value": 0.4967,
            "record_count": 8090
        },
        {
            "timestamp": "2023-01-12 00:00:00",
            "value": 0.5033,
            "record_count": 8085
        },
        {
            "timestamp": "2023-01-13 00:00:00",
            "value": 0.5007,
            "record_count": 8054
        },
        {
            "timestamp": "2023-01-14 00:00:00",
            "value": 0.4993,
            "record_count": 8168
        },
        {
            "timestamp": "2023-01-15 00:00:00",
            "value": 0.4983,
            "record_count": 7839
        },
        {
            "timestamp": "2023-01-16 00:00:00",
            "value": 0.5012,
            "record_count": 8088
        },
        {
            "timestamp": "2023-01-17 00:00:00",
            "value": 0.5096,
            "record_count": 8033
        },
        {
            "timestamp": "2023-01-18 00:00:00",
            "value": 0.4949,
            "record_count": 8177
        },
        {
            "timestamp": "2023-01-19 00:00:00",
            "value": 0.4992,
            "record_count": 8047
        },
        {
            "timestamp": "2023-01-20 00:00:00",
            "value": 0.4992,
            "record_count": 8089
        },
        {
            "timestamp": "2023-01-21 00:00:00",
            "value": 0.501,
            "record_count": 7912
        },
        {
            "timestamp": "2023-01-22 00:00:00",
            "value": 0.5039,
            "record_count": 7827
        },
        {
            "timestamp": "2023-01-23 00:00:00",
            "value": 0.5006,
            "record_count": 8038
        },
        {
            "timestamp": "2023-01-24 00:00:00",
            "value": 0.5027,
            "record_count": 8040
        },
        {
            "timestamp": "2023-01-25 00:00:00",
            "value": 0.4995,
            "record_count": 7995
        },
        {
            "timestamp": "2023-01-26 00:00:00",
            "value": 0.5023,
            "record_count": 8091
        },
        {
            "timestamp": "2023-01-27 00:00:00",
            "value": 0.4971,
            "record_count": 8092
        },
        {
            "timestamp": "2023-01-28 00:00:00",
            "value": 0.5013,
            "record_count": 8164
        },
        {
            "timestamp": "2023-01-29 00:00:00",
            "value": 0.4953,
            "record_count": 7882
        },
        {
            "timestamp": "2023-01-30 00:00:00",
            "value": 0.5021,
            "record_count": 7993
        },
        {
            "timestamp": "2023-01-31 00:00:00",
            "value": 0.4996,
            "record_count": 8139
        },
        {
            "timestamp": "2023-02-01 00:00:00",
            "value": 0.5032,
            "record_count": 7976
        },
        {
            "timestamp": "2023-02-02 00:00:00",
            "value": 0.5003,
            "record_count": 7960
        },
        {
            "timestamp": "2023-02-03 00:00:00",
            "value": 0.4986,
            "record_count": 8024
        },
        {
            "timestamp": "2023-02-04 00:00:00",
            "value": 0.5078,
            "record_count": 8062
        },
        {
            "timestamp": "2023-02-05 00:00:00",
            "value": 0.5021,
            "record_count": 8171
        },
        {
            "timestamp": "2023-02-06 00:00:00",
            "value": 0.4976,
            "record_count": 8220
        },
        {
            "timestamp": "2023-02-07 00:00:00",
            "value": 0.4997,
            "record_count": 8308
        },
        {
            "timestamp": "2023-02-08 00:00:00",
            "value": 0.5033,
            "record_count": 7937
        },
        {
            "timestamp": "2023-02-09 00:00:00",
            "value": 0.5008,
            "record_count": 8102
        },
        {
            "timestamp": "2023-02-10 00:00:00",
            "value": 0.4923,
            "record_count": 8020
        },
        {
            "timestamp": "2023-02-11 00:00:00",
            "value": 0.4949,
            "record_count": 8189
        },
        {
            "timestamp": "2023-02-12 00:00:00",
            "value": 0.4992,
            "record_count": 8133
        },
        {
            "timestamp": "2023-02-13 00:00:00",
            "value": 0.5012,
            "record_count": 7944
        },
        {
            "timestamp": "2023-02-14 00:00:00",
            "value": 0.5002,
            "record_count": 8090
        },
        {
            "timestamp": "2023-02-15 00:00:00",
            "value": 0.5061,
            "record_count": 8163
        },
        {
            "timestamp": "2023-02-16 00:00:00",
            "value": 0.5015,
            "record_count": 8087
        },
        {
            "timestamp": "2023-02-17 00:00:00",
            "value": 0.5023,
            "record_count": 7967
        },
        {
            "timestamp": "2023-02-18 00:00:00",
            "value": 0.497,
            "record_count": 8068
        },
        {
            "timestamp": "2023-02-19 00:00:00",
            "value": 0.5024,
            "record_count": 7998
        },
        {
            "timestamp": "2023-02-20 00:00:00",
            "value": 0.4931,
            "record_count": 8112
        },
        {
            "timestamp": "2023-02-21 00:00:00",
            "value": 0.504,
            "record_count": 8207
        },
        {
            "timestamp": "2023-02-22 00:00:00",
            "value": 0.5075,
            "record_count": 8090
        },
        {
            "timestamp": "2023-02-23 00:00:00",
            "value": 0.5013,
            "record_count": 7967
        },
        {
            "timestamp": "2023-02-24 00:00:00",
            "value": 0.5058,
            "record_count": 8031
        },
        {
            "timestamp": "2023-02-25 00:00:00",
            "value": 0.504,
            "record_count": 8207
        },
        {
            "timestamp": "2023-02-26 00:00:00",
            "value": 0.5022,
            "record_count": 8023
        },
        {
            "timestamp": "2023-02-27 00:00:00",
            "value": 0.4982,
            "record_count": 8049
        },
        {
            "timestamp": "2023-02-28 00:00:00",
            "value": 0.4969,
            "record_count": 8228
        },
        {
            "timestamp": "2023-03-01 00:00:00",
            "value": 0.4965,
            "record_count": 7936
        },
        {
            "timestamp": "2023-03-02 00:00:00",
            "value": 0.4955,
            "record_count": 7954
        },
        {
            "timestamp": "2023-03-03 00:00:00",
            "value": 0.4988,
            "record_count": 8066
        },
        {
            "timestamp": "2023-03-04 00:00:00",
            "value": 0.4971,
            "record_count": 8249
        },
        {
            "timestamp": "2023-03-05 00:00:00",
            "value": 0.4978,
            "record_count": 8083
        },
        {
            "timestamp": "2023-03-06 00:00:00",
            "value": 0.5039,
            "record_count": 8112
        },
        {
            "timestamp": "2023-03-07 00:00:00",
            "value": 0.499,
            "record_count": 8020
        },
        {
            "timestamp": "2023-03-08 00:00:00",
            "value": 0.4951,
            "record_count": 8031
        },
        {
            "timestamp": "2023-03-09 00:00:00",
            "value": 0.501,
            "record_count": 8057
        },
        {
            "timestamp": "2023-03-10 00:00:00",
            "value": 0.4955,
            "record_count": 8066
        },
        {
            "timestamp": "2023-03-11 00:00:00",
            "value": 0.5022,
            "record_count": 8072
        },
        {
            "timestamp": "2023-03-12 00:00:00",
            "value": 0.5044,
            "record_count": 8082
        },
        {
            "timestamp": "2023-03-13 00:00:00",
            "value": 0.5076,
            "record_count": 8059
        },
        {
            "timestamp": "2023-03-14 00:00:00",
            "value": 0.5032,
            "record_count": 7912
        },
        {
            "timestamp": "2023-03-15 00:00:00",
            "value": 0.4968,
            "record_count": 8165
        },
        {
            "timestamp": "2023-03-16 00:00:00",
            "value": 0.5006,
            "record_count": 8067
        },
        {
            "timestamp": "2023-03-17 00:00:00",
            "value": 0.5049,
            "record_count": 8212
        },
        {
            "timestamp": "2023-03-18 00:00:00",
            "value": 0.4976,
            "record_count": 8055
        },
        {
            "timestamp": "2023-03-19 00:00:00",
            "value": 0.4987,
            "record_count": 7986
        },
        {
            "timestamp": "2023-03-20 00:00:00",
            "value": 0.4991,
            "record_count": 7981
        },
        {
            "timestamp": "2023-03-21 00:00:00",
            "value": 0.4951,
            "record_count": 8124
        },
        {
            "timestamp": "2023-03-22 00:00:00",
            "value": 0.4989,
            "record_count": 8054
        },
        {
            "timestamp": "2023-03-23 00:00:00",
            "value": 0.4985,
            "record_count": 8050
        },
        {
            "timestamp": "2023-03-24 00:00:00",
            "value": 0.5044,
            "record_count": 7996
        },
        {
            "timestamp": "2023-03-25 00:00:00",
            "value": 0.4989,
            "record_count": 8150
        },
        {
            "timestamp": "2023-03-26 00:00:00",
            "value": 0.5052,
            "record_count": 8087
        },
        {
            "timestamp": "2023-03-27 00:00:00",
            "value": 0.507,
            "record_count": 8137
        },
        {
            "timestamp": "2023-03-28 00:00:00",
            "value": 0.4958,
            "record_count": 8086
        },
        {
            "timestamp": "2023-03-29 00:00:00",
            "value": 0.4963,
            "record_count": 8074
        },
        {
            "timestamp": "2023-03-30 00:00:00",
            "value": 0.4988,
            "record_count": 8158
        },
        {
            "timestamp": "2023-03-31 00:00:00",
            "value": 0.5018,
            "record_count": 7958
        },
        {
            "timestamp": "2023-04-01 00:00:00",
            "value": 0.4989,
            "record_count": 8025
        },
        {
            "timestamp": "2023-04-02 00:00:00",
            "value": 0.5033,
            "record_count": 8050
        },
        {
            "timestamp": "2023-04-03 00:00:00",
            "value": 0.4959,
            "record_count": 8049
        },
        {
            "timestamp": "2023-04-04 00:00:00",
            "value": 0.4981,
            "record_count": 8116
        },
        {
            "timestamp": "2023-04-05 00:00:00",
            "value": 0.5034,
            "record_count": 8159
        },
        {
            "timestamp": "2023-04-06 00:00:00",
            "value": 0.4997,
            "record_count": 8105
        },
        {
            "timestamp": "2023-04-07 00:00:00",
            "value": 0.496,
            "record_count": 8150
        },
        {
            "timestamp": "2023-04-08 00:00:00",
            "value": 0.4981,
            "record_count": 8172
        },
        {
            "timestamp": "2023-04-09 00:00:00",
            "value": 0.4982,
            "record_count": 8049
        },
        {
            "timestamp": "2023-04-10 00:00:00",
            "value": 0.5008,
            "record_count": 7999
        },
        {
            "timestamp": "2023-04-11 00:00:00",
            "value": 0.5045,
            "record_count": 8082
        },
        {
            "timestamp": "2023-04-12 00:00:00",
            "value": 0.4999,
            "record_count": 7933
        },
        {
            "timestamp": "2023-04-13 00:00:00",
            "value": 0.4995,
            "record_count": 8105
        },
        {
            "timestamp": "2023-04-14 00:00:00",
            "value": 0.4996,
            "record_count": 8047
        },
        {
            "timestamp": "2023-04-15 00:00:00",
            "value": 0.5043,
            "record_count": 8088
        },
        {
            "timestamp": "2023-04-16 00:00:00",
            "value": 0.5,
            "record_count": 8063
        },
        {
            "timestamp": "2023-04-17 00:00:00",
            "value": 0.4994,
            "record_count": 8156
        },
        {
            "timestamp": "2023-04-18 00:00:00",
            "value": 0.5026,
            "record_count": 8142
        },
        {
            "timestamp": "2023-04-19 00:00:00",
            "value": 0.4947,
            "record_count": 7977
        },
        {
            "timestamp": "2023-04-20 00:00:00",
            "value": 0.4991,
            "record_count": 8241
        },
        {
            "timestamp": "2023-04-21 00:00:00",
            "value": 0.496,
            "record_count": 8152
        },
        {
            "timestamp": "2023-04-22 00:00:00",
            "value": 0.5028,
            "record_count": 8030
        },
        {
            "timestamp": "2023-04-23 00:00:00",
            "value": 0.4978,
            "record_count": 8033
        },
        {
            "timestamp": "2023-04-24 00:00:00",
            "value": 0.5089,
            "record_count": 7997
        },
        {
            "timestamp": "2023-04-25 00:00:00",
            "value": 0.5015,
            "record_count": 8044
        },
        {
            "timestamp": "2023-04-26 00:00:00",
            "value": 0.5038,
            "record_count": 8031
        },
        {
            "timestamp": "2023-04-27 00:00:00",
            "value": 0.5073,
            "record_count": 8216
        },
        {
            "timestamp": "2023-04-28 00:00:00",
            "value": 0.4997,
            "record_count": 8322
        },
        {
            "timestamp": "2023-04-29 00:00:00",
            "value": 0.5013,
            "record_count": 8124
        },
        {
            "timestamp": "2023-04-30 00:00:00",
            "value": 0.4977,
            "record_count": 8111
        },
        {
            "timestamp": "2023-05-01 00:00:00",
            "value": 0.503,
            "record_count": 8086
        },
        {
            "timestamp": "2023-05-02 00:00:00",
            "value": 0.5,
            "record_count": 8103
        },
        {
            "timestamp": "2023-05-03 00:00:00",
            "value": 0.4997,
            "record_count": 8158
        },
        {
            "timestamp": "2023-05-04 00:00:00",
            "value": 0.5022,
            "record_count": 8011
        },
        {
            "timestamp": "2023-05-05 00:00:00",
            "value": 0.5025,
            "record_count": 8017
        },
        {
            "timestamp": "2023-05-06 00:00:00",
            "value": 0.5001,
            "record_count": 7967
        },
        {
            "timestamp": "2023-05-07 00:00:00",
            "value": 0.5016,
            "record_count": 7894
        },
        {
            "timestamp": "2023-05-08 00:00:00",
            "value": 0.5013,
            "record_count": 8087
        },
        {
            "timestamp": "2023-05-09 00:00:00",
            "value": 0.4988,
            "record_count": 8296
        },
        {
            "timestamp": "2023-05-10 00:00:00",
            "value": 0.4946,
            "record_count": 8133
        },
        {
            "timestamp": "2023-05-11 00:00:00",
            "value": 0.4982,
            "record_count": 8138
        },
        {
            "timestamp": "2023-05-12 00:00:00",
            "value": 0.4964,
            "record_count": 8041
        },
        {
            "timestamp": "2023-05-13 00:00:00",
            "value": 0.4989,
            "record_count": 8062
        },
        {
            "timestamp": "2023-05-14 00:00:00",
            "value": 0.5024,
            "record_count": 8074
        },
        {
            "timestamp": "2023-05-15 00:00:00",
            "value": 0.5018,
            "record_count": 8048
        },
        {
            "timestamp": "2023-05-16 00:00:00",
            "value": 0.4976,
            "record_count": 8224
        },
        {
            "timestamp": "2023-05-17 00:00:00",
            "value": 0.4952,
            "record_count": 8082
        },
        {
            "timestamp": "2023-05-18 00:00:00",
            "value": 0.5006,
            "record_count": 8130
        },
        {
            "timestamp": "2023-05-19 00:00:00",
            "value": 0.5044,
            "record_count": 8031
        },
        {
            "timestamp": "2023-05-20 00:00:00",
            "value": 0.5013,
            "record_count": 7919
        },
        {
            "timestamp": "2023-05-21 00:00:00",
            "value": 0.503,
            "record_count": 7892
        },
        {
            "timestamp": "2023-05-22 00:00:00",
            "value": 0.5031,
            "record_count": 7989
        },
        {
            "timestamp": "2023-05-23 00:00:00",
            "value": 0.4963,
            "record_count": 8037
        },
        {
            "timestamp": "2023-05-24 00:00:00",
            "value": 0.4989,
            "record_count": 7964
        },
        {
            "timestamp": "2023-05-25 00:00:00",
            "value": 0.4985,
            "record_count": 8162
        },
        {
            "timestamp": "2023-05-26 00:00:00",
            "value": 0.5007,
            "record_count": 7937
        },
        {
            "timestamp": "2023-05-27 00:00:00",
            "value": 0.5032,
            "record_count": 7987
        },
        {
            "timestamp": "2023-05-28 00:00:00",
            "value": 0.501,
            "record_count": 8143
        },
        {
            "timestamp": "2023-05-29 00:00:00",
            "value": 0.501,
            "record_count": 8191
        },
        {
            "timestamp": "2023-05-30 00:00:00",
            "value": 0.5004,
            "record_count": 8234
        },
        {
            "timestamp": "2023-05-31 00:00:00",
            "value": 0.5023,
            "record_count": 8168
        },
        {
            "timestamp": "2023-06-01 00:00:00",
            "value": 0.5038,
            "record_count": 8171
        },
        {
            "timestamp": "2023-06-02 00:00:00",
            "value": 0.5022,
            "record_count": 8164
        },
        {
            "timestamp": "2023-06-03 00:00:00",
            "value": 0.5008,
            "record_count": 8009
        },
        {
            "timestamp": "2023-06-04 00:00:00",
            "value": 0.5055,
            "record_count": 8109
        },
        {
            "timestamp": "2023-06-05 00:00:00",
            "value": 0.4995,
            "record_count": 7928
        },
        {
            "timestamp": "2023-06-06 00:00:00",
            "value": 0.4989,
            "record_count": 7865
        },
        {
            "timestamp": "2023-06-07 00:00:00",
            "value": 0.4902,
            "record_count": 7950
        },
        {
            "timestamp": "2023-06-08 00:00:00",
            "value": 0.4987,
            "record_count": 8028
        },
        {
            "timestamp": "2023-06-09 00:00:00",
            "value": 0.4936,
            "record_count": 8129
        },
        {
            "timestamp": "2023-06-10 00:00:00",
            "value": 0.503,
            "record_count": 8157
        },
        {
            "timestamp": "2023-06-11 00:00:00",
            "value": 0.4917,
            "record_count": 8220
        },
        {
            "timestamp": "2023-06-12 00:00:00",
            "value": 0.4998,
            "record_count": 8166
        },
        {
            "timestamp": "2023-06-13 00:00:00",
            "value": 0.5053,
            "record_count": 7985
        },
        {
            "timestamp": "2023-06-14 00:00:00",
            "value": 0.497,
            "record_count": 7974
        },
        {
            "timestamp": "2023-06-15 00:00:00",
            "value": 0.501,
            "record_count": 8109
        },
        {
            "timestamp": "2023-06-16 00:00:00",
            "value": 0.5067,
            "record_count": 8085
        },
        {
            "timestamp": "2023-06-17 00:00:00",
            "value": 0.4953,
            "record_count": 8090
        },
        {
            "timestamp": "2023-06-18 00:00:00",
            "value": 0.5025,
            "record_count": 7959
        },
        {
            "timestamp": "2023-06-19 00:00:00",
            "value": 0.4947,
            "record_count": 8216
        },
        {
            "timestamp": "2023-06-20 00:00:00",
            "value": 0.504,
            "record_count": 8222
        },
        {
            "timestamp": "2023-06-21 00:00:00",
            "value": 0.5016,
            "record_count": 8181
        },
        {
            "timestamp": "2023-06-22 00:00:00",
            "value": 0.5033,
            "record_count": 8001
        },
        {
            "timestamp": "2023-06-23 00:00:00",
            "value": 0.4974,
            "record_count": 8144
        },
        {
            "timestamp": "2023-06-24 00:00:00",
            "value": 0.5015,
            "record_count": 7959
        },
        {
            "timestamp": "2023-06-25 00:00:00",
            "value": 0.4994,
            "record_count": 8059
        },
        {
            "timestamp": "2023-06-26 00:00:00",
            "value": 0.5086,
            "record_count": 8183
        },
        {
            "timestamp": "2023-06-27 00:00:00",
            "value": 0.5039,
            "record_count": 8151
        },
        {
            "timestamp": "2023-06-28 00:00:00",
            "value": 0.498,
            "record_count": 8103
        },
        {
            "timestamp": "2023-06-29 00:00:00",
            "value": 0.5004,
            "record_count": 8152
        },
        {
            "timestamp": "2023-06-30 00:00:00",
            "value": 0.4986,
            "record_count": 8062
        },
        {
            "timestamp": "2023-07-01 00:00:00",
            "value": 0.4932,
            "record_count": 8239
        },
        {
            "timestamp": "2023-07-02 00:00:00",
            "value": 0.5026,
            "record_count": 8120
        },
        {
            "timestamp": "2023-07-03 00:00:00",
            "value": 0.4989,
            "record_count": 8178
        },
        {
            "timestamp": "2023-07-04 00:00:00",
            "value": 0.5,
            "record_count": 8140
        },
        {
            "timestamp": "2023-07-05 00:00:00",
            "value": 0.5038,
            "record_count": 7972
        },
        {
            "timestamp": "2023-07-06 00:00:00",
            "value": 0.497,
            "record_count": 8130
        },
        {
            "timestamp": "2023-07-07 00:00:00",
            "value": 0.5038,
            "record_count": 8012
        },
        {
            "timestamp": "2023-07-08 00:00:00",
            "value": 0.4987,
            "record_count": 7988
        },
        {
            "timestamp": "2023-07-09 00:00:00",
            "value": 0.4998,
            "record_count": 7985
        },
        {
            "timestamp": "2023-07-10 00:00:00",
            "value": 0.5003,
            "record_count": 8103
        },
        {
            "timestamp": "2023-07-11 00:00:00",
            "value": 0.5039,
            "record_count": 8073
        },
        {
            "timestamp": "2023-07-12 00:00:00",
            "value": 0.5049,
            "record_count": 8113
        },
        {
            "timestamp": "2023-07-13 00:00:00",
            "value": 0.5009,
            "record_count": 8011
        },
        {
            "timestamp": "2023-07-14 00:00:00",
            "value": 0.4987,
            "record_count": 7969
        },
        {
            "timestamp": "2023-07-15 00:00:00",
            "value": 0.5037,
            "record_count": 8165
        },
        {
            "timestamp": "2023-07-16 00:00:00",
            "value": 0.5007,
            "record_count": 8197
        },
        {
            "timestamp": "2023-07-17 00:00:00",
            "value": 0.5006,
            "record_count": 8150
        },
        {
            "timestamp": "2023-07-18 00:00:00",
            "value": 0.4982,
            "record_count": 8104
        },
        {
            "timestamp": "2023-07-19 00:00:00",
            "value": 0.4955,
            "record_count": 8110
        },
        {
            "timestamp": "2023-07-20 00:00:00",
            "value": 0.4968,
            "record_count": 4132
        },
        {
            "timestamp": "NaT",
            "value": 0.4997,
            "record_count": 180575
        }
    ]
}

export const MOCK_VMS: VmsResponse = {
    "cohorts": [
        {
            "task_type": "io",
            "task_priority": "",
            "avg_compute_value": 89225.4457,
            "avg_efficiency": 0.5019,
            "avg_throughput": 115721.93,
            "avg_power": 249.64,
            "total_waste_events": 3946.0,
            "record_count": 59906
        },
        {
            "task_type": "network",
            "task_priority": "medium",
            "avg_compute_value": 4837.5459,
            "avg_efficiency": 0.5013,
            "avg_throughput": 7438.05,
            "avg_power": 250.25,
            "total_waste_events": 12139.0,
            "record_count": 180737
        },
        {
            "task_type": "compute",
            "task_priority": "",
            "avg_compute_value": 931.1735,
            "avg_efficiency": 0.4993,
            "avg_throughput": 1786.72,
            "avg_power": 250.08,
            "total_waste_events": 4100.0,
            "record_count": 59537
        },
        {
            "task_type": "",
            "task_priority": "medium",
            "avg_compute_value": 485.2353,
            "avg_efficiency": 0.5007,
            "avg_throughput": 761.36,
            "avg_power": 250.26,
            "total_waste_events": 3960.0,
            "record_count": 59826
        },
        {
            "task_type": "network",
            "task_priority": "",
            "avg_compute_value": 447.2447,
            "avg_efficiency": 0.5015,
            "avg_throughput": 877.8,
            "avg_power": 249.64,
            "total_waste_events": 4067.0,
            "record_count": 60170
        },
        {
            "task_type": "io",
            "task_priority": "medium",
            "avg_compute_value": 317.1078,
            "avg_efficiency": 0.4999,
            "avg_throughput": 1316.08,
            "avg_power": 250.01,
            "total_waste_events": 12076.0,
            "record_count": 180509
        },
        {
            "task_type": "network",
            "task_priority": "high",
            "avg_compute_value": 305.9028,
            "avg_efficiency": 0.499,
            "avg_throughput": 696.67,
            "avg_power": 250.6,
            "total_waste_events": 12392.0,
            "record_count": 179741
        },
        {
            "task_type": "compute",
            "task_priority": "low",
            "avg_compute_value": 291.0603,
            "avg_efficiency": 0.5002,
            "avg_throughput": 604.94,
            "avg_power": 250.73,
            "total_waste_events": 12301.0,
            "record_count": 179411
        },
        {
            "task_type": "io",
            "task_priority": "low",
            "avg_compute_value": 261.4481,
            "avg_efficiency": 0.4997,
            "avg_throughput": 631.2,
            "avg_power": 249.59,
            "total_waste_events": 12029.0,
            "record_count": 179578
        },
        {
            "task_type": "",
            "task_priority": "low",
            "avg_compute_value": 259.2266,
            "avg_efficiency": 0.5017,
            "avg_throughput": 578.28,
            "avg_power": 249.37,
            "total_waste_events": 4071.0,
            "record_count": 60453
        },
        {
            "task_type": "compute",
            "task_priority": "medium",
            "avg_compute_value": 255.0599,
            "avg_efficiency": 0.4997,
            "avg_throughput": 574.9,
            "avg_power": 249.87,
            "total_waste_events": 12161.0,
            "record_count": 179628
        },
        {
            "task_type": "",
            "task_priority": "high",
            "avg_compute_value": 251.336,
            "avg_efficiency": 0.4998,
            "avg_throughput": 566.9,
            "avg_power": 250.48,
            "total_waste_events": 4041.0,
            "record_count": 59863
        },
        {
            "task_type": "compute",
            "task_priority": "high",
            "avg_compute_value": 246.0458,
            "avg_efficiency": 0.5012,
            "avg_throughput": 575.94,
            "avg_power": 249.64,
            "total_waste_events": 12180.0,
            "record_count": 180154
        },
        {
            "task_type": "network",
            "task_priority": "low",
            "avg_compute_value": 243.2715,
            "avg_efficiency": 0.4999,
            "avg_throughput": 574.57,
            "avg_power": 250.11,
            "total_waste_events": 12195.0,
            "record_count": 179965
        },
        {
            "task_type": "",
            "task_priority": "",
            "avg_compute_value": 205.8522,
            "avg_efficiency": 0.4942,
            "avg_throughput": 442.49,
            "avg_power": 249.72,
            "total_waste_events": 1319.0,
            "record_count": 19820
        },
        {
            "task_type": "io",
            "task_priority": "high",
            "avg_compute_value": 195.2888,
            "avg_efficiency": 0.5009,
            "avg_throughput": 425.38,
            "avg_power": 250.29,
            "total_waste_events": 12117.0,
            "record_count": 180702
        }
    ],
    "sort_by": "compute_value",
    "sort_order": "desc",
    "aggregation_note": "Aggregated by (task_type, task_priority) cohort. vm_id grouping is not used because vm_id is near-unique (1 row per VM in this dataset)."
}

export const MOCK_ANOMALIES: AnomaliesResponse = {
    "behavioral": [
        {
            "vm_id": "e6654521-5602-4d30-8ef8-7c420b069cbd",
            "task_type": "network",
            "task_priority": "high",
            "task_status": "",
            "behavioral_anomaly_score": 1.0,
            "energy_efficiency": 0.9394568204879761,
            "cpu_usage": 1.5425643920898438,
            "memory_usage": 75.3785629272461,
            "power_consumption": 210.9443359375,
            "compute_value": 1.4492
        },
        {
            "vm_id": "a8614cf2-f5ce-47d9-8ec2-01e3c0f729e0",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "completed",
            "behavioral_anomaly_score": 1.0,
            "energy_efficiency": 0.823367714881897,
            "cpu_usage": 40.955841064453125,
            "memory_usage": 99.5855484008789,
            "power_consumption": 320.21917724609375,
            "compute_value": 33.7217
        },
        {
            "vm_id": "",
            "task_type": "compute",
            "task_priority": "medium",
            "task_status": "completed",
            "behavioral_anomaly_score": 1.0,
            "energy_efficiency": 0.8973430395126343,
            "cpu_usage": 99.50614929199219,
            "memory_usage": 49.97608947753906,
            "power_consumption": 87.81106567382812,
            "compute_value": 89.2912
        },
        {
            "vm_id": "d631599b-e773-4138-98e9-9f52db9d4870",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.987308919429779,
            "energy_efficiency": 0.5020555257797241,
            "cpu_usage": 16.79475212097168,
            "memory_usage": 72.34117126464844,
            "power_consumption": 134.96633911132812,
            "compute_value": 8.4319
        },
        {
            "vm_id": "490ca542-4293-430a-8896-6ed68beecda9",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9854294657707214,
            "energy_efficiency": 0.8011929392814636,
            "cpu_usage": 6.403236389160156,
            "memory_usage": 45.13599395751953,
            "power_consumption": 319.12054443359375,
            "compute_value": 5.1302
        },
        {
            "vm_id": "31626588-17be-494c-ba78-d49a1523f6ce",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9815795421600342,
            "energy_efficiency": 0.8349401354789734,
            "cpu_usage": 98.97986602783203,
            "memory_usage": 1.4114314317703247,
            "power_consumption": 486.3734130859375,
            "compute_value": 82.6423
        },
        {
            "vm_id": "903fe055-dcfd-4e84-8c06-b1f25acbe4a1",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9767472147941589,
            "energy_efficiency": 0.8725910186767578,
            "cpu_usage": 30.901878356933594,
            "memory_usage": 11.689753532409668,
            "power_consumption": 494.2473449707031,
            "compute_value": 26.9647
        },
        {
            "vm_id": "",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9731557965278625,
            "energy_efficiency": 0.46676313877105713,
            "cpu_usage": 32.35893630981445,
            "memory_usage": 36.11885070800781,
            "power_consumption": 33.585105895996094,
            "compute_value": 15.104
        },
        {
            "vm_id": "4c1b225f-97c2-4eea-9a0a-fbbb66eadd2d",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.966688334941864,
            "energy_efficiency": 0.24192239344120026,
            "cpu_usage": 15.087077140808105,
            "memory_usage": 92.19135284423828,
            "power_consumption": 236.79957580566406,
            "compute_value": 3.6499
        },
        {
            "vm_id": "8a9f7cd3-6cf4-422c-9704-c78c8141742c",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9636362195014954,
            "energy_efficiency": 0.9318881630897522,
            "cpu_usage": 29.00071144104004,
            "memory_usage": 20.731809616088867,
            "power_consumption": 17.355167388916016,
            "compute_value": 27.0254
        },
        {
            "vm_id": "d7f8542d-6841-41ff-8e92-bad0a0626335",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9611061215400696,
            "energy_efficiency": 0.25207921862602234,
            "cpu_usage": 26.386810302734375,
            "memory_usage": 24.460771560668945,
            "power_consumption": 376.9324645996094,
            "compute_value": 6.6516
        },
        {
            "vm_id": "7821d9c2-1af5-4c2e-830c-31d911698a8c",
            "task_type": "compute",
            "task_priority": "low",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.957240104675293,
            "energy_efficiency": 0.4878072440624237,
            "cpu_usage": 92.30685424804688,
            "memory_usage": 0.8629429340362549,
            "power_consumption": 35.071834564208984,
            "compute_value": 45.028
        },
        {
            "vm_id": "8c8e010c-f1b5-4ac4-af53-56061a2b01e4",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9570271968841553,
            "energy_efficiency": 0.7867361903190613,
            "cpu_usage": 50.05475616455078,
            "memory_usage": 0.8370969891548157,
            "power_consumption": 460.1664123535156,
            "compute_value": 39.3799
        },
        {
            "vm_id": "902b4cec-2c38-4289-a06a-6e9a90e8afcc",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9544204473495483,
            "energy_efficiency": 0.6058415770530701,
            "cpu_usage": 31.916406631469727,
            "memory_usage": 96.21908569335938,
            "power_consumption": 250.2472381591797,
            "compute_value": 19.3363
        },
        {
            "vm_id": "0f22c310-bd74-4411-89e8-b9b16152edb4",
            "task_type": "io",
            "task_priority": "",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9544014930725098,
            "energy_efficiency": 0.8751991391181946,
            "cpu_usage": 8.597820281982422,
            "memory_usage": 58.52997589111328,
            "power_consumption": 408.4070739746094,
            "compute_value": 7.5248
        },
        {
            "vm_id": "d9708b54-8ab2-4b23-8cba-b5e101a96fc2",
            "task_type": "network",
            "task_priority": "low",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9521098136901855,
            "energy_efficiency": 0.8455687165260315,
            "cpu_usage": 80.67762756347656,
            "memory_usage": 47.965415954589844,
            "power_consumption": 250.2472381591797,
            "compute_value": 68.2185
        },
        {
            "vm_id": "9f4a251a-71e1-45da-9257-3fd9f5db05c0",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "",
            "behavioral_anomaly_score": 0.9517053961753845,
            "energy_efficiency": 0.25197529792785645,
            "cpu_usage": 95.93378448486328,
            "memory_usage": 86.52136993408203,
            "power_consumption": 437.74884033203125,
            "compute_value": 24.1729
        },
        {
            "vm_id": "ec88bf2a-4e77-4863-9b9c-dd1cb2f58e8d",
            "task_type": "network",
            "task_priority": "",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9515940546989441,
            "energy_efficiency": 0.6007265448570251,
            "cpu_usage": 34.8467903137207,
            "memory_usage": 89.16901397705078,
            "power_consumption": 9.67924976348877,
            "compute_value": 20.9334
        },
        {
            "vm_id": "75a95bde-5f19-49b1-be97-6470e82401e7",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9512861371040344,
            "energy_efficiency": 0.8942154049873352,
            "cpu_usage": 38.531795501708984,
            "memory_usage": 30.119182586669922,
            "power_consumption": 26.065898895263672,
            "compute_value": 34.4557
        },
        {
            "vm_id": "5bb9203d-1866-4ea1-915c-df0288fbd875",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9504806995391846,
            "energy_efficiency": 0.9397340416908264,
            "cpu_usage": 18.723237991333008,
            "memory_usage": 51.0036735534668,
            "power_consumption": 499.2182922363281,
            "compute_value": 17.5949
        },
        {
            "vm_id": "84985849-2be4-4bdd-9d24-54f3153222b0",
            "task_type": "network",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9503403902053833,
            "energy_efficiency": 0.942638099193573,
            "cpu_usage": 16.800439834594727,
            "memory_usage": 51.87627410888672,
            "power_consumption": 277.9983215332031,
            "compute_value": 15.8367
        },
        {
            "vm_id": "474220e1-9fcd-4bcf-a8ab-4d7f617d06a6",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "",
            "behavioral_anomaly_score": 0.9448304176330566,
            "energy_efficiency": 0.8743192553520203,
            "cpu_usage": 75.38819122314453,
            "memory_usage": 28.34734535217285,
            "power_consumption": 387.83990478515625,
            "compute_value": 65.9133
        },
        {
            "vm_id": "ffdb8675-8052-4ca0-be94-947471777d22",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.943902313709259,
            "energy_efficiency": 0.8069719672203064,
            "cpu_usage": 59.5191535949707,
            "memory_usage": 49.97608947753906,
            "power_consumption": 250.2472381591797,
            "compute_value": 48.0303
        },
        {
            "vm_id": "b1669845-fd69-4f5a-b904-0d51eb831a79",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9420416355133057,
            "energy_efficiency": 0.9062760472297668,
            "cpu_usage": 43.10110855102539,
            "memory_usage": 55.08658981323242,
            "power_consumption": 390.8777160644531,
            "compute_value": 39.0615
        },
        {
            "vm_id": "",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9414740800857544,
            "energy_efficiency": 0.946229875087738,
            "cpu_usage": 91.94696807861328,
            "memory_usage": 37.65694046020508,
            "power_consumption": 378.3850402832031,
            "compute_value": 87.003
        },
        {
            "vm_id": "07d5f1da-602d-4ca6-970b-24ec2171114c",
            "task_type": "io",
            "task_priority": "",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9400202035903931,
            "energy_efficiency": 0.38975799083709717,
            "cpu_usage": 73.9487075805664,
            "memory_usage": 4.611369609832764,
            "power_consumption": 421.93621826171875,
            "compute_value": 28.8221
        },
        {
            "vm_id": "956b8d29-aa87-43f1-9f2c-ddb95fccb604",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9390890598297119,
            "energy_efficiency": 0.5646305680274963,
            "cpu_usage": 5.340245246887207,
            "memory_usage": 28.07151222229004,
            "power_consumption": 204.2484130859375,
            "compute_value": 3.0153
        },
        {
            "vm_id": "",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9379088282585144,
            "energy_efficiency": 0.9022819995880127,
            "cpu_usage": 24.73914909362793,
            "memory_usage": 49.97608947753906,
            "power_consumption": 428.37969970703125,
            "compute_value": 22.3217
        },
        {
            "vm_id": "69595ec4-1d9a-41c5-baa1-65bc51e5cb3c",
            "task_type": "network",
            "task_priority": "low",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9356436729431152,
            "energy_efficiency": 0.6619890928268433,
            "cpu_usage": 96.4091567993164,
            "memory_usage": 77.94708251953125,
            "power_consumption": 5.065524101257324,
            "compute_value": 63.8218
        },
        {
            "vm_id": "68bb9ed7-223d-4ef6-9755-fe92c6576025",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "",
            "behavioral_anomaly_score": 0.9348544478416443,
            "energy_efficiency": 0.822187066078186,
            "cpu_usage": 5.172579288482666,
            "memory_usage": 12.434159278869629,
            "power_consumption": 33.79048156738281,
            "compute_value": 4.2528
        },
        {
            "vm_id": "37c74fa3-c865-4eca-9fd5-6eab66ec08f0",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9336874485015869,
            "energy_efficiency": 0.4416140615940094,
            "cpu_usage": 24.85800552368164,
            "memory_usage": 49.97608947753906,
            "power_consumption": 475.9093933105469,
            "compute_value": 10.9776
        },
        {
            "vm_id": "4deab605-8168-4b6d-bc5e-1e41593485d3",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9334908127784729,
            "energy_efficiency": 0.31494882702827454,
            "cpu_usage": 21.06182289123535,
            "memory_usage": 33.45512390136719,
            "power_consumption": 184.17788696289062,
            "compute_value": 6.6334
        },
        {
            "vm_id": "f830dbdc-2003-4f19-9ee8-e2d0cee54f8b",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9332583546638489,
            "energy_efficiency": 0.3377160429954529,
            "cpu_usage": 49.46049499511719,
            "memory_usage": 49.97608947753906,
            "power_consumption": 199.73178100585938,
            "compute_value": 16.7036
        },
        {
            "vm_id": "d8cfe87b-4f17-4ceb-a71f-8073c51a6d87",
            "task_type": "compute",
            "task_priority": "",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9321981072425842,
            "energy_efficiency": 0.8626823425292969,
            "cpu_usage": 38.399993896484375,
            "memory_usage": 8.099651336669922,
            "power_consumption": 124.24524688720703,
            "compute_value": 33.127
        },
        {
            "vm_id": "8794df67-195e-4be4-bcf7-701170ad0919",
            "task_type": "compute",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9304350018501282,
            "energy_efficiency": 0.7287311553955078,
            "cpu_usage": 10.263541221618652,
            "memory_usage": 21.64400863647461,
            "power_consumption": 413.8325500488281,
            "compute_value": 7.4794
        },
        {
            "vm_id": "",
            "task_type": "network",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9300057888031006,
            "energy_efficiency": 0.2314661145210266,
            "cpu_usage": 50.05475616455078,
            "memory_usage": 58.691917419433594,
            "power_consumption": 445.0345153808594,
            "compute_value": 11.586
        },
        {
            "vm_id": "c519c468-acae-43cc-be8c-2b81fc37dc57",
            "task_type": "io",
            "task_priority": "low",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9295389652252197,
            "energy_efficiency": 0.9884074926376343,
            "cpu_usage": 88.98287200927734,
            "memory_usage": 69.0059585571289,
            "power_consumption": 250.2472381591797,
            "compute_value": 87.9513
        },
        {
            "vm_id": "fdaf59d4-2437-40c4-871f-f57d00d059ed",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "",
            "behavioral_anomaly_score": 0.9288660287857056,
            "energy_efficiency": 0.9047775864601135,
            "cpu_usage": 97.58914184570312,
            "memory_usage": 71.03282165527344,
            "power_consumption": 448.5049743652344,
            "compute_value": 88.2965
        },
        {
            "vm_id": "810a9083-29d4-4e00-8a1e-3b4798fbe6f0",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9269017577171326,
            "energy_efficiency": 0.6455941200256348,
            "cpu_usage": 83.03858947753906,
            "memory_usage": 78.01771545410156,
            "power_consumption": 195.21412658691406,
            "compute_value": 53.6092
        },
        {
            "vm_id": "7f075b4b-530b-4a9d-82e3-c942fc8b1f6f",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9257070422172546,
            "energy_efficiency": 0.5451844334602356,
            "cpu_usage": 26.577198028564453,
            "memory_usage": 78.9830093383789,
            "power_consumption": 436.377685546875,
            "compute_value": 14.4895
        },
        {
            "vm_id": "688d8cbd-3c20-495c-8623-2ad8207b0ab1",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9249798059463501,
            "energy_efficiency": 0.9514337778091431,
            "cpu_usage": 20.53800392150879,
            "memory_usage": 49.97608947753906,
            "power_consumption": 254.7408447265625,
            "compute_value": 19.5406
        },
        {
            "vm_id": "65915627-5863-44f8-b38b-086bcedaefcb",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9210018515586853,
            "energy_efficiency": 0.9296079277992249,
            "cpu_usage": 33.42548370361328,
            "memory_usage": 45.848365783691406,
            "power_consumption": 402.4092102050781,
            "compute_value": 31.0726
        },
        {
            "vm_id": "ea9aa632-cd4b-4389-96ec-01be40c73950",
            "task_type": "io",
            "task_priority": "",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9185426235198975,
            "energy_efficiency": 0.8026837110519409,
            "cpu_usage": 77.67190551757812,
            "memory_usage": 7.111358165740967,
            "power_consumption": 414.4600524902344,
            "compute_value": 62.346
        },
        {
            "vm_id": "bb58b36e-2f34-4910-8d89-75d6fd6d859e",
            "task_type": "compute",
            "task_priority": "low",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9161542057991028,
            "energy_efficiency": 0.9806117415428162,
            "cpu_usage": 12.179250717163086,
            "memory_usage": 20.14180564880371,
            "power_consumption": 255.46470642089844,
            "compute_value": 11.9431
        },
        {
            "vm_id": "7b9824f4-14bc-47e4-95a9-253f4df0964c",
            "task_type": "compute",
            "task_priority": "medium",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9152684807777405,
            "energy_efficiency": 0.7299343347549438,
            "cpu_usage": 6.398092269897461,
            "memory_usage": 33.59782791137695,
            "power_consumption": 7.612282752990723,
            "compute_value": 4.6702
        },
        {
            "vm_id": "f15c2c18-a67b-413d-b871-fd2d2b58a3a2",
            "task_type": "io",
            "task_priority": "medium",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9149461388587952,
            "energy_efficiency": 0.7677733898162842,
            "cpu_usage": 83.69906616210938,
            "memory_usage": 95.65447235107422,
            "power_consumption": 417.169189453125,
            "compute_value": 64.2619
        },
        {
            "vm_id": "",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "running",
            "behavioral_anomaly_score": 0.9143555760383606,
            "energy_efficiency": 0.4291626513004303,
            "cpu_usage": 65.62892150878906,
            "memory_usage": 97.30917358398438,
            "power_consumption": 25.136877059936523,
            "compute_value": 28.1655
        },
        {
            "vm_id": "9ea3aaea-8511-4a54-b336-06134fe04540",
            "task_type": "network",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9142223000526428,
            "energy_efficiency": 0.40586239099502563,
            "cpu_usage": 94.89449310302734,
            "memory_usage": 28.411251068115234,
            "power_consumption": 467.1998291015625,
            "compute_value": 38.5141
        },
        {
            "vm_id": "317df94f-54a8-407b-a8f5-116bb15c1ce1",
            "task_type": "compute",
            "task_priority": "medium",
            "task_status": "completed",
            "behavioral_anomaly_score": 0.9137871265411377,
            "energy_efficiency": 0.5255060195922852,
            "cpu_usage": 11.021367073059082,
            "memory_usage": 4.790729999542236,
            "power_consumption": 477.9214172363281,
            "compute_value": 5.7918
        },
        {
            "vm_id": "e9a4c5f3-6812-455f-b2fe-77227778b364",
            "task_type": "io",
            "task_priority": "high",
            "task_status": "waiting",
            "behavioral_anomaly_score": 0.9136595129966736,
            "energy_efficiency": 0.8921833634376526,
            "cpu_usage": 86.77310943603516,
            "memory_usage": 92.49932098388672,
            "power_consumption": 15.464851379394531,
            "compute_value": 77.4175
        }
    ],
    "fleet_alert": {
        "active": true,
        "waste_pct": 6.75,
        "vms_wasting_energy": 135094,
        "threshold_pct": 5.0,
        "alert_mode": "fleet_banner"
    },
    "waste_samples": [
        {
            "vm_id": "2de6f954-141e-4adb-bef0-ab79a8d79183",
            "task_type": "network",
            "task_priority": "low",
            "power_consumption": 499.9990539550781,
            "energy_efficiency": 0.044319767504930496,
            "compute_value": 1.5854088068008423,
            "timestamp": "2023-05-26T18:42:42"
        },
        {
            "vm_id": "aa6e2c37-729d-4f16-86a3-3477d986a4b6",
            "task_type": "network",
            "task_priority": "medium",
            "power_consumption": 499.9983215332031,
            "energy_efficiency": 0.5764288902282715,
            "compute_value": 40.0984001159668,
            "timestamp": "2023-05-31T20:33:39"
        },
        {
            "vm_id": "3e1d2b55-1cb9-4853-8074-542c4c6b8a35",
            "task_type": "compute",
            "task_priority": "",
            "power_consumption": 499.9981689453125,
            "energy_efficiency": 0.7987481355667114,
            "compute_value": 45.292381286621094,
            "timestamp": "2023-04-12T07:31:20"
        },
        {
            "vm_id": "593e680c-bae2-43cc-bcb1-d3a7132fa181",
            "task_type": "network",
            "task_priority": "medium",
            "power_consumption": 499.99505615234375,
            "energy_efficiency": 0.7609603404998779,
            "compute_value": 34.11139678955078,
            "timestamp": "2023-04-16T07:35:58"
        },
        {
            "vm_id": "1b63bcd3-6aaa-4836-84c8-4660f7a43ef4",
            "task_type": "compute",
            "task_priority": "low",
            "power_consumption": 499.9942321777344,
            "energy_efficiency": 0.48391106724739075,
            "compute_value": 53.92720413208008,
            "timestamp": "2023-01-04T20:10:03"
        },
        {
            "vm_id": "358b2e4e-015c-442e-b881-79c293c57015",
            "task_type": "",
            "task_priority": "medium",
            "power_consumption": 499.9940185546875,
            "energy_efficiency": 0.5832483768463135,
            "compute_value": 265.31683349609375,
            "timestamp": "2023-03-25T12:04:32"
        },
        {
            "vm_id": "a93f3a71-f4a9-4eaf-abe0-22c73c048f5a",
            "task_type": "compute",
            "task_priority": "high",
            "power_consumption": 499.9936828613281,
            "energy_efficiency": 0,
            "compute_value": 0.0,
            "timestamp": "2023-04-13T01:12:14"
        },
        {
            "vm_id": "9221ac13-afeb-4e47-9131-a6099c23dd8d",
            "task_type": "io",
            "task_priority": "high",
            "power_consumption": 499.9925842285156,
            "energy_efficiency": 0.5622106790542603,
            "compute_value": 4.828096866607666,
            "timestamp": "2023-07-03T23:41:20"
        },
        {
            "vm_id": "b5d66bda-f195-4fb1-840b-4b7a04274c8d",
            "task_type": "compute",
            "task_priority": "low",
            "power_consumption": 499.9921569824219,
            "energy_efficiency": 0.33962592482566833,
            "compute_value": 22.999305725097656,
            "timestamp": "2023-03-29T17:51:31"
        },
        {
            "vm_id": "734c77cb-4dfe-4246-a694-2a7b4aacb6d8",
            "task_type": "compute",
            "task_priority": "low",
            "power_consumption": 499.9920959472656,
            "energy_efficiency": 0.9877433180809021,
            "compute_value": 139.24533081054688,
            "timestamp": "2023-03-31T21:20:15"
        },
        {
            "vm_id": "4f5268d8-ab02-40d3-928b-e73a09cc6a25",
            "task_type": "compute",
            "task_priority": "medium",
            "power_consumption": 499.99200439453125,
            "energy_efficiency": 0.3315899074077606,
            "compute_value": 23.610946655273438,
            "timestamp": "2023-04-02T20:19:54"
        },
        {
            "vm_id": "3fe426df-8042-4968-8393-9806132ffe3f",
            "task_type": "",
            "task_priority": "low",
            "power_consumption": 499.99029541015625,
            "energy_efficiency": 0.8979344964027405,
            "compute_value": 2653.05615234375,
            "timestamp": "2023-04-08T09:57:53"
        },
        {
            "vm_id": "5afa76d7-d19d-41d2-8d84-70fd75c0de0d",
            "task_type": "network",
            "task_priority": "low",
            "power_consumption": 499.98980712890625,
            "energy_efficiency": 0.8462172150611877,
            "compute_value": 148.34632873535156,
            "timestamp": "2023-01-25T00:38:16"
        },
        {
            "vm_id": "6a28b668-7823-472d-85a3-ef24b190ccb1",
            "task_type": "",
            "task_priority": "medium",
            "power_consumption": 499.9871520996094,
            "energy_efficiency": 0.2686554491519928,
            "compute_value": 40.04357147216797,
            "timestamp": "2023-02-05T08:25:16"
        },
        {
            "vm_id": "89bd2842-928a-42c6-a0fe-93a4ec2a9fbb",
            "task_type": "network",
            "task_priority": "high",
            "power_consumption": 499.9864501953125,
            "energy_efficiency": 0.5082837343215942,
            "compute_value": 228.49795532226562,
            "timestamp": "2023-06-05T03:58:10"
        },
        {
            "vm_id": "254565a2-5f1c-4beb-ad29-df2bf1d2046e",
            "task_type": "compute",
            "task_priority": "low",
            "power_consumption": 499.9827880859375,
            "energy_efficiency": 0.463746041059494,
            "compute_value": 42.75586700439453,
            "timestamp": "2023-02-02T02:08:53"
        },
        {
            "vm_id": "",
            "task_type": "compute",
            "task_priority": "",
            "power_consumption": 499.9827880859375,
            "energy_efficiency": 0.7261467576026917,
            "compute_value": 19.824384689331055,
            "timestamp": "2023-07-03T07:37:42"
        },
        {
            "vm_id": "77261d8e-062c-4bb7-b18b-9b767f175849",
            "task_type": "io",
            "task_priority": "high",
            "power_consumption": 499.98248291015625,
            "energy_efficiency": 0.32123422622680664,
            "compute_value": 13.1602144241333,
            "timestamp": "NaT"
        },
        {
            "vm_id": "6a23016f-7f4c-4ced-9334-02410b4f4fd1",
            "task_type": "io",
            "task_priority": "low",
            "power_consumption": 499.9820251464844,
            "energy_efficiency": 0.5007250905036926,
            "compute_value": 737.1632690429688,
            "timestamp": "2023-02-03T20:01:02"
        },
        {
            "vm_id": "",
            "task_type": "compute",
            "task_priority": "medium",
            "power_consumption": 499.9820251464844,
            "energy_efficiency": 0.9606533050537109,
            "compute_value": 157.87062072753906,
            "timestamp": "2023-02-23T11:53:13"
        }
    ]
}

export const MOCK_ROC: RocResponse = {
    "fpr": [
        0.0,
        0.0002,
        0.0003,
        0.0007,
        0.0008,
        0.001,
        0.001,
        0.0013,
        0.0015,
        0.0015,
        0.0017,
        0.0018,
        0.0023,
        0.0023,
        0.0027,
        0.0028,
        0.0035,
        0.0038,
        0.0043,
        0.0045,
        0.005,
        0.005,
        0.008,
        0.008,
        0.0081,
        0.0091,
        0.0095,
        0.0096,
        0.0096,
        0.0153,
        0.0154,
        0.0171,
        0.0202,
        0.0204,
        0.0226,
        0.0232,
        0.0241,
        0.0254,
        0.0257,
        0.0302,
        0.0323,
        0.0753,
        0.0765,
        0.0788,
        0.8293,
        0.8293,
        0.8597,
        0.8618,
        0.9107,
        0.9116,
        0.9132,
        0.9134,
        0.9182,
        0.9184,
        0.9317,
        0.9326,
        0.9453,
        0.9456,
        0.9585,
        0.9592,
        0.9668,
        0.967,
        0.9771,
        0.9779,
        0.9783,
        0.9809,
        0.9871,
        0.9872,
        0.9889,
        0.9895,
        0.99,
        0.9934,
        0.994,
        0.994,
        0.9945,
        0.9949,
        0.995,
        0.9957,
        0.9959,
        0.9962,
        0.997,
        0.9973,
        0.9975,
        0.9975,
        0.9977,
        0.998,
        0.9983,
        0.9985,
        0.9985,
        0.9988,
        0.9988,
        0.999,
        0.999,
        0.9995,
        0.9998,
        1.0,
        1.0
    ],
    "tpr": [
        0.0,
        0.0002,
        0.0003,
        0.0008,
        0.001,
        0.0013,
        0.0017,
        0.0018,
        0.0022,
        0.0023,
        0.0025,
        0.0032,
        0.0033,
        0.0035,
        0.0037,
        0.0037,
        0.0037,
        0.0042,
        0.0052,
        0.0052,
        0.0055,
        0.0057,
        0.0077,
        0.0078,
        0.0078,
        0.0088,
        0.009,
        0.0092,
        0.0093,
        0.0145,
        0.0153,
        0.017,
        0.0205,
        0.0205,
        0.0231,
        0.0251,
        0.0255,
        0.026,
        0.0261,
        0.0321,
        0.0331,
        0.0729,
        0.0743,
        0.0769,
        0.8105,
        0.8112,
        0.8391,
        0.8421,
        0.8968,
        0.8973,
        0.8983,
        0.8988,
        0.9054,
        0.9054,
        0.9214,
        0.9226,
        0.9391,
        0.9392,
        0.954,
        0.9542,
        0.9647,
        0.9654,
        0.977,
        0.9777,
        0.9779,
        0.9817,
        0.9883,
        0.9883,
        0.9895,
        0.9898,
        0.9903,
        0.9937,
        0.994,
        0.9942,
        0.9945,
        0.9948,
        0.9952,
        0.9958,
        0.9958,
        0.996,
        0.9965,
        0.9967,
        0.9968,
        0.9973,
        0.9982,
        0.9982,
        0.9983,
        0.9988,
        0.999,
        0.999,
        0.9992,
        0.9992,
        0.9993,
        0.9993,
        0.9995,
        0.9998,
        1.0
    ],
    "auc": 0.4903,
    "model": "completion_predictor"
}

export const MOCK_FORECAST_24H: Forecast24hResponse = {
    "horizon_hours": 24,
    "series": [
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        },
        {
            "timestamp": "NaT",
            "predicted_kw": 49822.07,
            "ci_lower": 49809.14,
            "ci_upper": 49835.01
        }
    ],
    "mae": 5.28
}

export const MOCK_FORECAST_7DAY: Forecast7DayResponse = {
    "horizon_days": 7,
    "series": [
        {
            "date": "NaT",
            "predicted_kw": 80.33,
            "ci_lower": -1332.7,
            "ci_upper": 1493.36
        },
        {
            "date": "NaT",
            "predicted_kw": 97.9,
            "ci_lower": -1315.12,
            "ci_upper": 1510.93
        },
        {
            "date": "NaT",
            "predicted_kw": 98.38,
            "ci_lower": -1314.65,
            "ci_upper": 1511.41
        },
        {
            "date": "NaT",
            "predicted_kw": 80.69,
            "ci_lower": -1332.34,
            "ci_upper": 1493.72
        },
        {
            "date": "NaT",
            "predicted_kw": 112.02,
            "ci_lower": -1301.01,
            "ci_upper": 1525.05
        },
        {
            "date": "NaT",
            "predicted_kw": 145.5,
            "ci_lower": -1267.53,
            "ci_upper": 1558.53
        },
        {
            "date": "NaT",
            "predicted_kw": 112.43,
            "ci_lower": -1300.6,
            "ci_upper": 1525.46
        }
    ],
    "peak_day": "NaT",
    "peak_predicted_kw": 145.5,
    "alert": false,
    "alert_message": ""
}

export const MOCK_TOPOLOGY: TopologyResponse = {
    "nodes": [
        {
            "id": "compute",
            "label": "COMPUTE",
            "task_type": "compute",
            "vm_count": 598730,
            "stats": {
                "avg_cpu": 49.99,
                "avg_memory": 49.94,
                "avg_power": 250.08,
                "avg_efficiency": 0.5003,
                "avg_compute_value": 330.3672,
                "waste_pct": 6.8
            }
        },
        {
            "id": "io",
            "label": "IO",
            "task_type": "io",
            "vm_count": 600695,
            "stats": {
                "avg_cpu": 50.02,
                "avg_memory": 50.03,
                "avg_power": 249.93,
                "avg_efficiency": 0.5003,
                "avg_compute_value": 9130.4568,
                "waste_pct": 6.69
            }
        },
        {
            "id": "network",
            "label": "NETWORK",
            "task_type": "network",
            "vm_count": 600613,
            "stats": {
                "avg_cpu": 50.04,
                "avg_memory": 49.95,
                "avg_power": 250.25,
                "avg_efficiency": 0.5002,
                "avg_compute_value": 1664.9621,
                "waste_pct": 6.79
            }
        }
    ],
    "edges": [
        {
            "source": "compute",
            "target": "io",
            "weight": 0.6663
        },
        {
            "source": "compute",
            "target": "network",
            "weight": 0.6663
        },
        {
            "source": "io",
            "target": "network",
            "weight": 0.6674
        }
    ],
    "layout": "force",
    "aggregation": "task_type_cluster_nodes"
}
