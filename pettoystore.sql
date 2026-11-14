SET FOREIGN_KEY_CHECKS = 0;

create database if not exists pettoystore;
use pettoystore;

drop table if exists comments;
drop table if exists order_items;
drop table if exists orders;
drop table if exists product;
drop table if exists categories;
drop table if exists users;
drop table if exists admsta;

create table admsta
(
  id int(11) not null auto_increment primary key,
  fname varchar(50) default '',
  lname varchar(50) default '',
  email varchar(100) not null unique,
  password varchar(255) not null,
  role varchar(20) not null default 'staff',
  `c.phone` varchar(5) not null default '+60',
  phone varchar(20) default null,
  address text default null,
  city varchar(50) default '',
  zip varchar(20) default '',
  state varchar(50) default '',
  country varchar(50) not null default 'Malaysia'
);

insert into admsta (fname, lname, email, password, role, phone, address, city, zip, state, country) values
('Store', 'Admin', 'admin@system.com', 'admin123', 'admin', null, null, '', '', '', 'Malaysia');

create table users
(
  id int(11) not null auto_increment primary key,
  fname varchar(50) default '',
  lname varchar(50) default '',
  email varchar(100) not null unique,
  password varchar(255) not null,
  role varchar(20) not null default 'customer',
  `c.phone` varchar(5) not null default '+60',
  phone varchar(20) default null,
  address text default null,
  city varchar(50) default '',
  zip varchar(20) default '',
  state varchar(50) default '',
  country varchar(50) not null default 'Malaysia',
  cart longtext default null
);

create table categories
(
  id int(11) not null auto_increment primary key,
  name varchar(100) not null,
  description text default null
);

create table product
(
  id int(11) not null auto_increment primary key,
  name varchar(150) not null,
  price decimal(10,2) not null default 0.00,
  stock int(11) not null default 0,
  description text default null,
  image varchar(255) default null,
  category_id int(11),
  foreign key (category_id) references categories(id)
);

create table orders
(
  id int(11) not null auto_increment primary key,
  date datetime not null default current_timestamp,
  total decimal(10,2) not null default 0.00,
  paymentName varchar(100) default '',
  fee decimal(10,2) not null default 0.00,
  status varchar(50) not null default 'pending',
  shipping_name varchar(100) default '',
  shipping_phone varchar(20) default '',
  shipping_addr text default null,
  shipping_city varchar(50) default '',
  shipping_zip varchar(20) default '',
  shipping_state varchar(50) default '',
  shipping_country varchar(50) not null default 'Malaysia',
  pickup_time time default null,
  pickup_date date default null,
  user_id int(11) not null,
  items longtext default null,
  tracking_num varchar(100) default null,
  courier varchar(100) not null default 'J&T Express',
  foreign key (user_id) references users(id)
);

create table order_items
(
  id int(11) not null auto_increment primary key,
  quantity int(11) not null default 1,
  subtotal decimal(10,2) not null default 0.00,
  order_id int(11) not null,
  product_id int(11) not null,
  foreign key (order_id) references orders(id),
  foreign key (product_id) references product(id)
);

create table comments
(
  id int(11) not null auto_increment primary key,
  title varchar(255) default '',
  body text default null,
  rating tinyint(1) not null default 5,
  date datetime not null default current_timestamp,
  user_id int(11) not null,
  product_id int(11) not null,
  foreign key (user_id) references users(id),
  foreign key (product_id) references product(id)
);

SET FOREIGN_KEY_CHECKS = 1;
