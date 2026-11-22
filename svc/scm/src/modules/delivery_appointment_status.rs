//! 供应商送货预约状态唯一集合。
//!
//! 落库列：`scm.supplier_delivery_appointments.status`（varchar，DB 默认 `pending`）。
//! 值集与前端 `apps/web/src/schemas/scm/deliveryAppointment.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeliveryAppointmentStatus {
    Pending,
    Approved,
    Rejected,
    Arrived,
    Completed,
    Cancelled,
}

impl DeliveryAppointmentStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 6] = [
        "pending",
        "approved",
        "rejected",
        "arrived",
        "completed",
        "cancelled",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Arrived => "arrived",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "arrived" => Some(Self::Arrived),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(DeliveryAppointmentStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            DeliveryAppointmentStatus::DB_VALUES,
            [
                "pending",
                "approved",
                "rejected",
                "arrived",
                "completed",
                "cancelled"
            ]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in DeliveryAppointmentStatus::DB_VALUES {
            assert_eq!(
                DeliveryAppointmentStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(DeliveryAppointmentStatus::from_db_str("bogus"), None);
    }
}
