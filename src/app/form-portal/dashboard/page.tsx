
"use client";

import { useEffect, useState, useId, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormAdmin, FormQuestion, Form as FormType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, Trash2, Save, Type, MessageSquare, CheckSquare, List, Radio, BarChart, Edit, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createForm, getFormsByCreator } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const QuestionBuilder = ({ question, onUpdate, onRemove }: { question: FormQuestion; onUpdate: (updatedQuestion: FormQuestion) => void; onRemove: () => void; }) => {
    
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${ (question.options?.length || 0) + 1}`];
        onUpdate({ ...question, options: newOptions });
    }

    const removeOption = (index: number) => {
        const newOptions = [...(question.options || [])];
        newOptions.splice(index, 1);
        onUpdate({ ...question, options: newOptions });
    }

    const QuestionIcon = {
        text: <Type />,
        textarea: <MessageSquare />,
        radio: <Radio />,
        checkbox: <CheckSquare />,
        select: <List />,
    };

    return (
        <Card className="bg-secondary/50">
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow space-y-2">
                        <Label htmlFor={`q-text-${question.id}`}>Question Text</Label>
                        <Input 
                            id={`q-text-${question.id}`}
                            placeholder="What would you like to ask?" 
                            value={question.text} 
                            onChange={e => onUpdate({ ...question, text: e.target.value })}
                        />
                    </div>
                    <div className="w-48 space-y-2">
                         <Label htmlFor={`q-type-${question.id}`}>Type</Label>
                         <Select value={question.type} onValueChange={(type: FormQuestion['type']) => onUpdate({ ...question, type, options: ['radio', 'checkbox', 'select'].includes(type) ? question.options || ['Option 1'] : [] })}>
                            <SelectTrigger id={`q-type-${question.id}`}>
                                <div className="flex items-center gap-2">
                                    {QuestionIcon[question.type]}
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text"><div className="flex items-center gap-2"><Type /> Short Text</div></SelectItem>
                                <SelectItem value="textarea"><div className="flex items-center gap-2"><MessageSquare /> Paragraph</div></SelectItem>
                                <SelectItem value="radio"><div className="flex items-center gap-2"><Radio /> Multiple Choice</div></SelectItem>
                                <SelectItem value="checkbox"><div className="flex items-center gap-2"><CheckSquare /> Checkboxes</div></SelectItem>
                                <SelectItem value="select"><div className="flex items-center gap-2"><List /> Dropdown</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {['radio', 'checkbox', 'select'].includes(question.type) && (
                    <div className="space-y-2 pl-4 border-l-2">
                        <Label>Options</Label>
                        {question.options?.map((opt, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={opt} onChange={e => handleOptionChange(index, e.target.value)} />
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeOption(index)} disabled={(question.options?.length || 0) <= 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addOption}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                    </div>
                )}

                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                     <div className="flex items-center space-x-2">
                        <Switch id={`required-${question.id}`} checked={question.isRequired} onCheckedChange={checked => onUpdate({ ...question, isRequired: checked })} />
                        <Label htmlFor={`required-${question.id}`}>Required</Label>
                    </div>
                    <Button variant="destructive" size="sm" onClick={onRemove}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Question
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const FormBuilder = ({ onFormSaved }: { onFormSaved: () => void }) => {
    const [user, setUser] = useState<FormAdmin | null>(null);
    const { toast } = useToast();
    const [formTitle, setFormTitle] = useState('Untitled Form');
    const [formDescription, setFormDescription] = useState('');
    const [questions, setQuestions] = useState<FormQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);

     useEffect(() => {
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
          setUser(JSON.parse(userJson));
        }
      }, []);


    const addQuestion = () => {
        const newQuestion: FormQuestion = {
            id: new Date().getTime().toString(),
            text: '',
            type: 'text',
            isRequired: false,
            options: [],
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (updatedQuestion: FormQuestion) => {
        setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    };
    
    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    }

    const handleSaveForm = async () => {
        if (!formTitle.trim()) {
            toast({ variant: 'destructive', title: "Form title is required." });
            return;
        }
        if (questions.length === 0) {
            toast({ variant: 'destructive', title: "At least one question is required." });
            return;
        }
        if (!user) return;

        setIsSaving(true);
        const result = await createForm({
            title: formTitle,
            description: formDescription,
            questions: questions,
            createdBy: user.id
        });

        if (result.success) {
            toast({ title: "Form Saved Successfully!", description: "Your form has been created."});
            setFormTitle('Untitled Form');
            setFormDescription('');
            setQuestions([]);
            onFormSaved(); // Trigger the refresh
        } else {
            toast({ variant: 'destructive', title: "Error Saving Form", description: result.error });
        }
        setIsSaving(false);
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <Input
                        value={formTitle}
                        onChange={e => setFormTitle(e.target.value)}
                        placeholder="Form Title"
                        className="text-3xl font-bold border-0 shadow-none focus-visible:ring-0 pl-2 h-auto"
                    />
                    <Textarea
                        value={formDescription}
                        onChange={e => setFormDescription(e.target.value)}
                        placeholder="Form Description (optional)"
                        className="text-base text-muted-foreground border-0 shadow-none focus-visible:ring-0 pl-2 mt-2"
                    />
                </CardContent>
            </Card>

            <div className="space-y-4">
                {questions.map((q) => (
                    <QuestionBuilder 
                        key={q.id}
                        question={q}
                        onUpdate={updateQuestion}
                        onRemove={() => removeQuestion(q.id)}
                    />
                ))}
            </div>

            <div className="flex justify-center my-6">
                <Button variant="outline" onClick={addQuestion}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Question
                </Button>
            </div>

            <div className="flex justify-end gap-2">
                <Button onClick={handleSaveForm} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Save Form
                </Button>
            </div>
        </div>
    )
}

const MyForms = ({ forms, loading, onEditForm }: { forms: FormType[], loading: boolean, onEditForm: (form: FormType) => void }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>My Forms</CardTitle>
                <CardDescription>All forms you have created.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Responses</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground"/>
                                    </TableCell>
                                </TableRow>
                            ) : forms.length > 0 ? (
                                forms.map(form => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">{form.title}</TableCell>
                                        <TableCell>0</TableCell>
                                        <TableCell>{new Date(form.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon"><Link2 className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon"><BarChart className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">You haven't created any forms yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

export default function FormPortalDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<FormAdmin | null>(null);
  const [forms, setForms] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create");

  const fetchForms = useCallback(async (userId: string) => {
      setLoading(true);
      const userForms = await getFormsByCreator(userId);
      setForms(userForms);
      setLoading(false);
  }, []);

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    const userJson = sessionStorage.getItem('user');

    if (userRole === 'formadmin' && userJson) {
      const currentUser = JSON.parse(userJson);
      setUser(currentUser);
      fetchForms(currentUser.id);
    } else {
      router.push('/form-portal/login');
    }
  }, [router, fetchForms]);
  
  const handleFormSaved = () => {
    if (user) {
        fetchForms(user.id);
        setActiveTab("my-forms");
    }
  }


  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Form Portal Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome, {user.name}.</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
            <TabsTrigger value="create">Create New Form</TabsTrigger>
            <TabsTrigger value="my-forms">My Forms</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="mt-6">
            <FormBuilder onFormSaved={handleFormSaved}/>
        </TabsContent>
        <TabsContent value="my-forms" className="mt-6">
            <MyForms forms={forms} loading={loading} onEditForm={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
