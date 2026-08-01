#![allow(dead_code)]

pub mod announcement;
pub mod asset;
pub mod audit_log;
pub mod consolidation;
pub mod dict;
pub mod finance;
pub mod material;
pub mod meeting_room;
pub mod migration;
pub mod office_supplies;
pub mod production_order;
pub mod uuid_helpers;
pub mod vehicle;

pub use announcement::{Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest};
pub use asset::{Asset, CreateAssetRequest, UpdateAssetRequest};
pub use audit_log::AuditLog;
pub use dict::{
    CreateDictItemRequest, CreateDictTypeRequest, DictItem, DictType, UpdateDictItemRequest,
    UpdateDictTypeRequest,
};
pub use meeting_room::{
    CreateMeetingBookingRequest, CreateMeetingRoomRequest, MeetingBooking, MeetingRoom,
    UpdateMeetingBookingRequest, UpdateMeetingRoomRequest,
};
pub use migration::{AddColumnRequest, ColumnInfo, DbChange, ModifyColumnRequest, TableInfo};
pub use office_supplies::{CreateOfficeSupplyRequest, OfficeSupply, UpdateOfficeSupplyRequest};
pub use vehicle::{
    CreateVehicleRequest, CreateVehicleRequestRequest, UpdateVehicleRequest,
    UpdateVehicleRequestRequest, Vehicle, VehicleRequest as VehicleApplication,
};
