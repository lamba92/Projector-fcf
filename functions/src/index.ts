import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
import DataSnapshot = admin.database.DataSnapshot;
import Change = functions.Change
import EventContext = functions.EventContext

admin.initializeApp();

export const createIndexUser = functions.database
    .ref('users/{uid}/email')
    .onCreate((snapshot: DataSnapshot, context: EventContext) => {
        const email: string = snapshot.val();
        return admin.database().ref('indexes/email-uid/'
            + encodeEmail(email)).set(context.params.uid)
    });
export const updateIndexUser = functions.database
    .ref('users/{uid}/email')
    .onUpdate((snapshot: Change<DataSnapshot>, context: EventContext) => {
        const newEmail: string = snapshot.after.val();
        const oldEmail: string = snapshot.before.val();
        return admin.database()
            .ref('indexes/email-uid/' + encodeEmail(newEmail))
            .set(context.params.uid,
                (error: Error) => {
                    admin.database().ref('indexes/email-uid/'
                        + encodeEmail(oldEmail)).set(null)
                }).then((value) => {
                    return admin.database().ref('previousUserData/'
                        + context.params.uid + "emails").push(oldEmail)
            })
    });
function encodeEmail(s: string): string {
    return s
        .replace(new RegExp('\\.', 'g'), '%2E')
        .replace(new RegExp('@', 'g'), '%40');
}


export const processNewProject = functions.database
    .ref('add_projects/{uid}')
    .onCreate((snapshot: DataSnapshot, context: EventContext) => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const userId = context.params.uid;
        let projectYear: string;
        let otherYear: number;
        if (currentDate.getMonth() >= 9) {
            otherYear = currentYear + 1;
            projectYear = currentYear + "-" + otherYear
        } else {
            otherYear = currentYear - 1;
            projectYear = otherYear + "-" + currentYear
        }
        const project = snapshot.val();
        project.year = projectYear;
        const ref = admin.database().ref('projects').push(project);
        ref.then((value: any) =>{
            return admin.database().ref('add_projects/' + userId)
                .set(null).then((useless) => {
                return admin.database().ref('indexes/total-projects')
                        .once('value',totalProjects => {
                        if (totalProjects.val() !== undefined) {
                            return admin.database()
                                .ref('indexes/total-projects')
                                .set(totalProjects.val() + 1);
                        } else return admin.database()
                            .ref('indexes/total-projects').set(1);
                });
            });
        });
        return ref
    });

// export const addIdToProject = functions.database
//     .ref('projects/{pid}')
//     .onCreate((projectSnapshot: DataSnapshot, context: EventContext) => {
//         return admin.database().ref('projects/' + context.params.pid + '/id').set(context.params.pid);
//     });

export const indexYears = functions.database
    .ref('projects/{pid}')
    .onCreate((projectSnapshot: DataSnapshot, context: EventContext) => {
        return admin.database().ref('indexes/projects-by-years/' + projectSnapshot.val().year + '/' + context.params.pid).set(true)
    });

export const indexOlderProfilePictures = functions.database
    .ref('users/{uid}/imgUri')
    .onUpdate((snapshot: Change<DataSnapshot>, context: EventContext) => {
        return admin.database().ref('previousUserData/' + context.params.uid + "/images").push(snapshot.before.val());
    });

export const exitProject = functions.database
    .ref('users/{uid}/projectId')
    .onDelete(((snapshot: DataSnapshot, context: EventContext) => {
        const projectId: string = snapshot.val();
        const userId: string = context.params.uid;
        return admin.database().ref('projects/' + projectId + "/owners/" + userId).set(null).then((useless: any) => {
            return admin.database().ref('previousUserData/' + userId + '/projects').push(projectId);
        });
    }));

export const deleteProject = functions.database
    .ref('projects/{pid}')
    .onUpdate((snapshot: Change<DataSnapshot>, context: EventContext) => {
        const projectId: string = context.params.pid;
        if(snapshot.after.val().owners === undefined){
            return admin.database().ref('previousProjects/' + projectId)
                .set(snapshot.after.val()).then((useless)=>{
                return admin.database().ref('projects/' + projectId)
                    .set(null).then(value =>{
                    return admin.database().ref('indexes/total-projects')
                        .once('value',totalProjects => {
                        return admin.database().ref('indexes/total-projects')
                            .set(totalProjects.val()-1);
                    })
                });
            });
        }
        return null
    });

// export const clearProjectImage = functions.database
//     .ref('projects/{pid}/images')
//     .onDelete((snapshot: DataSnapshot, context: EventContext) => {
//         return admin.storage().bucket().file('project/images/' + snapshot.key).delete();
//     });

export const addProjectToProfile = functions.database
    .ref('projects/{pid}/owners/{uid}')
    .onCreate((snapshot, context) => {
        return admin.database().ref('users/'
            + context.params.uid + "/projectId")
            .set(context.params.pid);
    });

export const countUsers = functions.database
    .ref('users/{uid}')
    .onCreate((snapshot, context) => {
        return admin.database().ref('indexes/total-users').once('value', (totalUsers: DataSnapshot) => {
            if(totalUsers.val() === undefined){
                return admin.database().ref('indexes/total-users').set(1)
            } else {
                return admin.database().ref('indexes/total-users').set(totalUsers.val() + 1)
            }
        });
    });