import type { Employee } from '../types';

export const currentUser = {
  name: 'Rahim Ahmed',
  initials: 'RA',
  title: 'Finance Manager',
  employeeId: 'EMP-10241',
  email: 'rahim.ahmed@abcgroup.com',
  company: 'ABC Foods Ltd.',
  department: 'Finance',
  branch: 'Corporate HQ — Gulshan'
};

export const employees: Employee[] = [
{ id: 'EMP-10241', name: 'Rahim Ahmed', position: 'Senior Accountant', department: 'Finance', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'rahim.ahmed@abcgroup.com', phone: '+880 1711 204 118', joined: '12 Mar 2019', manager: 'Nasrin Sultana', grade: 'G-07', location: 'Dhaka' },
{ id: 'EMP-10288', name: 'Karim Chowdhury', position: 'HR Manager', department: 'Human Resources', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'karim.c@abcgroup.com', phone: '+880 1712 884 021', joined: '02 Jan 2017', manager: 'Mahfuz Anam', grade: 'G-09', location: 'Dhaka' },
{ id: 'EMP-10322', name: 'Hasan Mahmud', position: 'Systems Engineer', department: 'Information Technology', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'on-leave', email: 'hasan.m@abcgroup.com', phone: '+880 1913 662 900', joined: '19 Jul 2021', manager: 'Faisal Ahmed', grade: 'G-06', location: 'Dhaka' },
{ id: 'EMP-10410', name: 'Nasrin Sultana', position: 'Head of Finance', department: 'Finance', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'nasrin.s@abcgroup.com', phone: '+880 1811 442 776', joined: '08 Sep 2015', manager: 'Mahfuz Anam', grade: 'G-11', location: 'Dhaka' },
{ id: 'EMP-10455', name: 'Imran Hossain', position: 'Procurement Officer', department: 'Procurement', company: 'ABC Foods Ltd.', branch: 'Savar Plant', status: 'active', email: 'imran.h@abcgroup.com', phone: '+880 1521 330 145', joined: '23 Nov 2020', manager: 'Shahidul Alam', grade: 'G-05', location: 'Savar' },
{ id: 'EMP-10501', name: 'Sabina Yasmin', position: 'Accounts Receivable Lead', department: 'Finance', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'sabina.y@abcgroup.com', phone: '+880 1614 220 883', joined: '15 Feb 2018', manager: 'Nasrin Sultana', grade: 'G-08', location: 'Dhaka' },
{ id: 'EMP-10566', name: 'Tanvir Rahman', position: 'Regional Sales Manager', department: 'Sales & Distribution', company: 'ABC Foods Ltd.', branch: 'Sylhet Sales Office', status: 'active', email: 'tanvir.r@abcgroup.com', phone: '+880 1777 101 004', joined: '30 Apr 2019', manager: 'Mahfuz Anam', grade: 'G-09', location: 'Sylhet' },
{ id: 'EMP-10610', name: 'Shahidul Alam', position: 'Head of Production', department: 'Production', company: 'ABC Foods Ltd.', branch: 'Savar Plant', status: 'active', email: 'shahidul.a@abcgroup.com', phone: '+880 1911 556 320', joined: '11 Jun 2014', manager: 'Mahfuz Anam', grade: 'G-11', location: 'Savar' },
{ id: 'EMP-10688', name: 'Rumana Haque', position: 'Finance Controller', department: 'Finance', company: 'ABC Technologies Ltd.', branch: 'Corporate HQ', status: 'active', email: 'rumana.h@abcgroup.com', phone: '+880 1811 998 110', joined: '05 Oct 2018', manager: 'Farhana Zaman', grade: 'G-10', location: 'Dhaka' },
{ id: 'EMP-10712', name: 'Sohel Rana', position: 'Fleet Operations Head', department: 'Fleet', company: 'ABC Transport Ltd.', branch: 'Chattogram DC', status: 'active', email: 'sohel.r@abcgroup.com', phone: '+880 1533 220 441', joined: '17 Jan 2016', manager: 'Jahangir Alam', grade: 'G-10', location: 'Chattogram' },
{ id: 'EMP-10790', name: 'Ayesha Siddika', position: 'Warehouse Supervisor', department: 'Warehouse', company: 'ABC Grocery Ltd.', branch: 'Chattogram DC', status: 'suspended', email: 'ayesha.s@abcgroup.com', phone: '+880 1655 774 118', joined: '09 Dec 2021', manager: 'Shirin Akter', grade: 'G-04', location: 'Chattogram' },
{ id: 'EMP-10844', name: 'Arif Islam', position: 'Treasury Analyst', department: 'Finance', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'arif.i@abcgroup.com', phone: '+880 1722 664 900', joined: '21 Aug 2022', manager: 'Nasrin Sultana', grade: 'G-06', location: 'Dhaka' },
{ id: 'EMP-10901', name: 'Mizanur Rahman', position: 'Finance Manager', department: 'Finance', company: 'ABC Transport Ltd.', branch: 'Corporate HQ', status: 'active', email: 'mizanur.r@abcgroup.com', phone: '+880 1811 220 776', joined: '14 May 2017', manager: 'Jahangir Alam', grade: 'G-09', location: 'Dhaka' },
{ id: 'EMP-10955', name: 'Farzana Yeasmin', position: 'Recruitment Specialist', department: 'Human Resources', company: 'ABC Foods Ltd.', branch: 'Corporate HQ', status: 'active', email: 'farzana.y@abcgroup.com', phone: '+880 1911 330 442', joined: '28 Feb 2023', manager: 'Karim Chowdhury', grade: 'G-05', location: 'Dhaka' },
{ id: 'EMP-11002', name: 'Jubayer Hossain', position: 'Machine Operator', department: 'Production', company: 'ABC Foods Ltd.', branch: 'Gazipur Plant II', status: 'inactive', email: 'jubayer.h@abcgroup.com', phone: '+880 1533 118 220', joined: '03 Mar 2020', manager: 'Shahidul Alam', grade: 'G-03', location: 'Gazipur' }];


export const attendanceToday = [
{ label: 'Present', value: 1842, tone: 'success' as const },
{ label: 'Late', value: 96, tone: 'warning' as const },
{ label: 'On Leave', value: 122, tone: 'info' as const },
{ label: 'Absent', value: 80, tone: 'danger' as const }];


export const leaveRequests = [
{ id: 'LV-2026-0412', employee: 'Hasan Mahmud', type: 'Annual Leave', from: '18 Sep 2026', to: '24 Sep 2026', days: 5, status: 'pending' as const },
{ id: 'LV-2026-0409', employee: 'Farzana Yeasmin', type: 'Sick Leave', from: '16 Sep 2026', to: '17 Sep 2026', days: 2, status: 'approved' as const },
{ id: 'LV-2026-0401', employee: 'Arif Islam', type: 'Casual Leave', from: '12 Sep 2026', to: '12 Sep 2026', days: 1, status: 'approved' as const },
{ id: 'LV-2026-0398', employee: 'Jubayer Hossain', type: 'Unpaid Leave', from: '08 Sep 2026', to: '20 Sep 2026', days: 9, status: 'rejected' as const }];