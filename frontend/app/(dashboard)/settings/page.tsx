'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { RefreshCw, Plus, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, zohoAPI } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { User, SyncLog } from '@/types'
import { USER_ROLES } from '@/lib/constants'
import { toast } from 'sonner'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [showAddUser, setShowAddUser] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersAPI.list()
      return res.data
    },
  })

  const { data: syncLogs, isLoading: syncLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const res = await zohoAPI.syncLogs()
      return res.data
    },
  })

  const { mutate: createUser, isPending: creatingUser } = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      reset()
      setShowAddUser(false)
    },
    onError: () => toast.error('Failed to create user'),
  })

  const { mutate: syncItems, isPending: syncingItems } = useMutation({
    mutationFn: () => zohoAPI.syncItems(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      toast.success('Zoho items sync started')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to start sync'
      toast.error(msg)
    },
  })

  const { mutate: syncContacts, isPending: syncingContacts } = useMutation({
    mutationFn: () => zohoAPI.syncContacts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      toast.success('Zoho contacts sync started')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to start sync'
      toast.error(msg)
    },
  })

  const { mutate: syncImages, isPending: syncingImages } = useMutation({
    mutationFn: () => zohoAPI.syncImages(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      toast.success('Image sync started — this may take a few minutes')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to start image sync'
      toast.error(msg)
    },
  })

  const users: User[] = usersData?.results || usersData || []
  const logs: SyncLog[] = syncLogs?.results || syncLogs || []

  const userColumns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (val) => <span className="font-medium">{String(val)}</span>,
    },
    {
      key: 'first_name',
      header: 'Name',
      render: (_, row) => `${row.first_name} ${row.last_name}`.trim() || '—',
    },
    { key: 'email', header: 'Email', render: (val) => String(val || '—') },
    {
      key: 'role',
      header: 'Role',
      render: (val) => {
        const role = USER_ROLES.find((r) => r.value === String(val))
        return (
          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
            {role?.label || String(val)}
          </span>
        )
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => (
        <span className={`text-xs font-medium ${val ? 'text-green-600' : 'text-gray-400'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  const syncLogColumns: Column<SyncLog>[] = [
    {
      key: 'sync_type',
      header: 'Type',
      render: (val) => <span className="capitalize font-medium">{String(val)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span
          className={`text-xs font-semibold ${
            String(val) === 'success'
              ? 'text-green-600'
              : String(val) === 'failed'
              ? 'text-red-600'
              : 'text-amber-600'
          }`}
        >
          {String(val).toUpperCase()}
        </span>
      ),
    },
    { key: 'records_synced', header: 'Synced' },
    { key: 'records_failed', header: 'Failed' },
    {
      key: 'error_message',
      header: 'Error',
      render: (val) => (
        <span className="text-xs text-gray-500 truncate max-w-xs block">
          {String(val || '—')}
        </span>
      ),
    },
    { key: 'created_at', header: 'Time', render: (val) => formatDate(String(val)) },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Settings" description="System configuration and management" />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sync">Sync Logs</TabsTrigger>
          <TabsTrigger value="zoho">Zoho Config</TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAddUser(true)}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
          <DataTable
            data={users}
            columns={userColumns}
            isLoading={usersLoading}
            emptyMessage="No users found"
            emptyIcon={<UserCircle className="h-10 w-10" />}
          />
        </TabsContent>

        {/* Sync logs tab */}
        <TabsContent value="sync" className="mt-4 space-y-4">
          <DataTable
            data={logs}
            columns={syncLogColumns}
            isLoading={syncLoading}
            emptyMessage="No sync logs"
          />
        </TabsContent>

        {/* Zoho config tab */}
        <TabsContent value="zoho" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Zoho Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Organization ID</Label>
                  <Input value="••••••••••" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <Input value="••••••••••••••••" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret</Label>
                  <Input value="••••••••••••••••••••" disabled type="password" />
                </div>
                <div className="space-y-1.5">
                  <Label>Access Token Status</Label>
                  <div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Manual Sync</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => syncItems()}
                    disabled={syncingItems}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingItems ? 'animate-spin' : ''}`} />
                    {syncingItems ? 'Syncing...' : 'Sync Items'}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => syncContacts()}
                    disabled={syncingContacts}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingContacts ? 'animate-spin' : ''}`} />
                    {syncingContacts ? 'Syncing...' : 'Sync Contacts'}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => syncImages()}
                    disabled={syncingImages}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingImages ? 'animate-spin' : ''}`} />
                    {syncingImages ? 'Syncing Images...' : 'Sync Images from Zoho'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((raw) => {
              const payload: Record<string, unknown> = {
                username: raw.username,
                password: raw.password,
                role:     raw.role,
                ...(raw.first_name ? { first_name: raw.first_name } : {}),
                ...(raw.last_name  ? { last_name:  raw.last_name  } : {}),
                ...(raw.email      ? { email:      raw.email      } : {}),
              }
              createUser(payload)
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input {...register('first_name')} placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input {...register('last_name')} placeholder="Last name" />
              </div>
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input {...register('username', { required: true })} placeholder="username" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...register('email')} type="email" placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input {...register('password', { required: true })} type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <select
                  {...register('role', { required: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingUser} className="bg-amber-600 hover:bg-amber-700">
                {creatingUser ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
