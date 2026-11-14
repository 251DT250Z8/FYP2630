Set foreign_key_checks = 0;

create database if not exists 'pettoystore' default character set utf8mb4 collate utf8mb4_unicode_ci;
use 'pettoystore';

drop table is exists 'admsta';
create table 'admsta'(
    'admsta_id' int(11) not null auto_increment,
    'fname' varchar(50) default '',
    'lname' varchar(50) default '',
    'email' varchar(100) not null,
    'password' varchar(255) not null,
    'role' varchar(20) not null default 'staff',
    'c.phone' varchar(5) not null default '+60',
    'phone' varchar(20) default null,
    'address' text default null,
    'city' varchar(50) default '',
    'state' varchar(50) default '',
    'zip' varchar(20) default '',
    
    primary key('admsta_id'),
    unique key 'email' ('email')
)

insert into 'admsta'('fname', 'lname', 'email', 'password', 'role', 'phone', 'address', 'city', 'state', 'zip') values
('Store', 'Admin', 'admin@system.com', 'admin123', 'admin', Null, null, '', '', '')

drop table if exists 'users';
create table 'users'(
    'user_id' int(11) not null auto_increment,
    'fname' varchar(50) default '',
    'lname' varchar(50) default '',
    'email' varchar(100) not null,
    'password' varchar(255) not null,
    'role' varchar(20) not null default 'customer',
    'c.phone' varchar(5) not null default '+60',
    'phone' varchar(20) default null,
    'address' text default null,
    'city' varchar(50) default '',
    'state' varchar(50) default '',
    'zip' varchar(20) default '',
    'cart' longtext default null,

    primary key('user_id')
)