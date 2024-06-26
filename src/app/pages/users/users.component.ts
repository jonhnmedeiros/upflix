import { Component } from '@angular/core';
import { UsersService } from './users.service';
import { User } from './user.model';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  constructor(
    private usersService: UsersService,
    private route: Router,
    private modal: NzModalService,
  ) {
  }

  users: User[] = [];
  filteredUsers: User[] = [];
  pages: number = 0;
  page: number = 1;
  totalPages: number = 0;
  usersResponse: any;
  loader: boolean = false;
  search: string = '';

  isEditing: boolean = false;

  // Modal Edit User
  isVisible = false;
  isOkLoading = false;
  user: User = {
    id: 0,
    email: '',
    first_name: '',
    last_name: '',
    avatar: ''
  };

  getUsers() {
    this.loader = true;
    this.usersService.getUsers(this.page).subscribe({
      next: response => {
        this.usersResponse = response;
        this.users = response.data;
        this.filteredUsers = response.data;
        this.pages = response.total_pages;
        this.totalPages = response.total_pages;
      },
      error: () => {
        this.modal.error({
          nzTitle: 'Error',
          nzContent: 'An error occurred while fetching users',
          nzOkText: 'Ok',
          nzOkType: 'primary',
          nzOkDanger: false,
          nzOnOk: () => console.log('Ok')
        });
      },
      complete: () => {
        this.loader = false;
      }
    });
  }

  changePage(page: number) {
    this.page = page;
    this.getUsers();
  }

  searchUser() {
    if (this.search.length > 0) {
      this.filteredUsers = [];
      this.users.find(user => {
        if (user.first_name.toLowerCase().includes(this.search.toLowerCase()) || user.last_name.toLowerCase().includes(this.search.toLowerCase()) || user.email.toLowerCase().includes(this.search.toLowerCase())) {
          this.filteredUsers.push(user);
        }
      });
    } else {
      this.filteredUsers = this.users;
    }
  }

  viewUser(id: number) {
    this.route.navigate(['/users', id]);
  }

  deleteUser(id: number, name: string) {
    this.modal.confirm({
      nzTitle: 'Are you sure delete this user?',
      nzContent: `<b style="color: red;">${name}</b>`,
      nzOkText: 'Yes',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => this.usersService.deleteUser(id).subscribe({
        error: () => {
          this.modal.error({
            nzTitle: 'Error',
            nzContent: 'An error occurred while deleting the user',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
        },
        complete: () => {
          const modalSucess = this.modal.success({
            nzTitle: 'User deleted successfully',
            nzContent: 'User has been deleted successfully',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
          setTimeout(() => modalSucess.destroy(), 2000);
          this.getUsers();
        }
      }),
      nzCancelText: 'No',
      nzOnCancel: () => console.log('Cancel')
    });

  }

  hadleEditUser(user: User) {
    this.user = user;
    this.isVisible = true;
    this.isEditing = true;
  }

  addUser() {
    this.user = { id: 0, email: '', first_name: '', last_name: '', avatar: '' };
    this.isVisible = true;
    this.isEditing = false;
  }

  handleOk(): void {
    if (this.user.email.length === 0 || this.user.first_name.length === 0 || this.user.last_name.length === 0) {
      this.modal.error({
        nzTitle: 'Error',
        nzContent: 'All fields are required',
        nzOkText: 'Ok',
        nzOkType: 'primary',
        nzOkDanger: false,
        nzOnOk: () => console.log('Ok')
      });
      return;
    }

    this.isOkLoading = true;
    if (!this.isEditing) {
      this.usersService.createUser(this.user).subscribe({
        error: () => {
          this.modal.error({
            nzTitle: 'Error',
            nzContent: 'An error occurred while creating the user',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
        },
        complete: () => {
          this.isVisible = false;
          this.isOkLoading = false;
          const modalSucess = this.modal.success({
            nzTitle: 'User created successfully',
            nzContent: 'User has been created successfully',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
          setTimeout(() => modalSucess.destroy(), 2000);
          this.getUsers();
        }
      });
    } else {
      this.usersService.updateUser(this.user).subscribe({
        error: () => {
          this.modal.error({
            nzTitle: 'Error',
            nzContent: 'An error occurred while updating the user',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
        },
        complete: () => {
          this.isVisible = false;
          this.isOkLoading = false;
          const modalSucess = this.modal.success({
            nzTitle: 'User updated successfully',
            nzContent: 'User has been updated successfully',
            nzOkText: 'Ok',
            nzOkType: 'primary',
            nzOkDanger: false,
            nzOnOk: () => console.log('Ok')
          });
          setTimeout(() => modalSucess.destroy(), 2000);
          this.getUsers();
        }
      });
    }

  }

  handleCancel(): void {
    this.isVisible = false;
  }

  exportToExcel() {
    const data = this.filteredUsers;
    const columns = this.getColumns(data);
    const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'data.xlsx');
  }

  exportToPdf() {
    const data = this.filteredUsers;
    const columns = this.getColumns(data);
    const rows = this.getRows(data, columns);
    const doc = new jsPDF();
    autoTable(doc, {
      head: [columns],
      body: rows
    });
    doc.save('data.pdf');
  }

  getColumns(data: any[]): string[] {
    const columns: string[] = [];
    data.forEach(row => {
      Object.keys(row).forEach(col => {
        if (!columns.includes(col)) {
          columns.push(col);
        }
      });
    });
    return columns;
  }

  getRows(data: any[], columns: string[]): any[] {
    const rows: any[] = [];
    data.forEach(row => {
      const values: any[] = [];
      columns.forEach(col => {
        values.push(row[col] || '');
      });
      rows.push(values);
    });
    return rows;
  }



  ngOnInit() {
    this.getUsers();
  }
}
