\set ON_ERROR_STOP 0
insert into organisation(id,name,is_btl) values ('00000000-0000-0000-0000-000000000001','BTL',true);
insert into app_user(id,organisation_id,name) values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','Misbah');
insert into project(id,code,organisation_id,kind,name,objective,budget,start_date,end_date) values ('00000000-0000-0000-0000-0000000000b1','T-1','00000000-0000-0000-0000-000000000001','internal','Test','Ship',100,'2026-01-01','2026-06-01');
-- internal project at discovery must fail
insert into delivery_wave(project_id,num,name,scope,current_phase) values ('00000000-0000-0000-0000-0000000000b1',1,'W1','s','discovery');
insert into delivery_wave(id,project_id,num,name,scope,current_phase) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1',1,'W1','s','design');
-- wave 2 without gate decision must fail
update delivery_wave set status='closed';
insert into delivery_wave(project_id,num,name,scope,current_phase) values ('00000000-0000-0000-0000-0000000000b1',2,'W2','s','design');
-- DoD check must fail
insert into work_item(wave_id,code,title,status,priority) values ('00000000-0000-0000-0000-0000000000c1','X','x','Done','High');
-- record proceed then wave 2 succeeds
insert into gate_decision(wave_id,outcome,recorded_by,checklist_snapshot) values ('00000000-0000-0000-0000-0000000000c1','proceed','00000000-0000-0000-0000-0000000000a1','[]');
insert into delivery_wave(project_id,num,name,scope,current_phase) values ('00000000-0000-0000-0000-0000000000b1',2,'W2','s','design');
select num, status, current_phase from delivery_wave order by num;
